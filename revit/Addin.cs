// SPDX-License-Identifier: MIT
using Autodesk.Revit.Attributes;
using Autodesk.Revit.DB;
using Autodesk.Revit.UI;
using Microsoft.Win32;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace WinMatch.Revit;

public class Application : IExternalApplication
{
    public Result OnStartup(UIControlledApplication app)
    {
        const string tab = "WinMatch";
        try { app.CreateRibbonTab(tab); } catch (Autodesk.Revit.Exceptions.ArgumentException) { }
        RibbonPanel panel = app.CreateRibbonPanel(tab, "BIM Studio");
        string path = Assembly.GetExecutingAssembly().Location;
        Add(panel, path, "Studio", "Open\nStudio", nameof(OpenStudio), "Scan every window and door in the active model and open the offline schedule studio.");
        Add(panel, path, "Selected", "Selected\nopenings", nameof(OpenSelection), "Scan selected windows and doors only.");
        Add(panel, path, "Locate", "Locate\nby mark", nameof(LocateOpenings), "Find openings in the model with an exact mark.");
        Add(panel, path, "IFC", "Export\nIFC", nameof(ExportIFC), "Export an IFC4 model with Revit base quantities for WinMatch IFC import.");
        Add(panel, path, "AutoTag", "Auto-tag\nviews", nameof(AutoTagViews), "Place category tags for marked windows and doors in chosen floor plans and elevations.");
        Add(panel, path, "LoadFamilies", "Load\nRFA library", nameof(LoadFamilies), "Load selected local window and door manufacturer families without replacing existing families.");
        Add(panel, path, "Update", "Apply\nmarks", nameof(ApplyMarks), "Review and apply an explicit WinMatch mark-update file.");
        return Result.Succeeded;
    }
    private static void Add(RibbonPanel panel, string path, string key, string label, string command, string tip)
    {
        var btn = (PushButton)panel.AddItem(new PushButtonData("WM_"+key, label, path, "WinMatch.Revit."+command));
        btn.ToolTip = tip;
        btn.LongDescription = tip + "\nModel data remains on your computer.";
    }
    public Result OnShutdown(UIControlledApplication app) => Result.Succeeded;
}

internal static class Bridge
{
    internal const string Version = "1.0.0";
    static readonly JsonSerializerOptions Options = new() { WriteIndented = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    internal static string ProjectKey(Document doc) => doc.ProjectInformation.UniqueId;
    internal static IEnumerable<FamilyInstance> Openings(Document doc) =>
        new FilteredElementCollector(doc).OfCategory(BuiltInCategory.OST_Windows).WhereElementIsNotElementType().OfType<FamilyInstance>()
            .Concat(new FilteredElementCollector(doc).OfCategory(BuiltInCategory.OST_Doors).WhereElementIsNotElementType().OfType<FamilyInstance>());
    internal static bool IsOpening(FamilyInstance f) => f.Category?.Id.Value == (long)BuiltInCategory.OST_Windows || f.Category?.Id.Value == (long)BuiltInCategory.OST_Doors;
    internal static string StringParam(Element e, BuiltInParameter p) => e.get_Parameter(p)?.AsString()?.Trim() ?? "";
    internal static double? Length(FamilyInstance f, BuiltInParameter p, bool typeFallback = true)
    {
        Parameter? x = f.get_Parameter(p);
        if ((x == null || !x.HasValue || x.StorageType != StorageType.Double) && typeFallback)
            x = f.Symbol?.get_Parameter(p);
        if (x == null || !x.HasValue || x.StorageType != StorageType.Double) return null;
        double mm = UnitUtils.ConvertFromInternalUnits(x.AsDouble(), UnitTypeId.Millimeters);
        return double.IsFinite(mm) ? Math.Round(mm, 2) : null;
    }
    internal static string RoomName(FamilyInstance f, bool window)
    {
        try { return window ? f.Room?.Name ?? "" : (f.ToRoom ?? f.FromRoom)?.Name ?? ""; }
        catch { return ""; } // Room association is phase dependent.
    }
    internal static object Row(Document doc, FamilyInstance f)
    {
        bool window = f.Category!.Id.Value == (long)BuiltInCategory.OST_Windows;
        var width = Length(f, BuiltInParameter.FAMILY_WIDTH_PARAM);
        var height = Length(f, BuiltInParameter.FAMILY_HEIGHT_PARAM);
        return new {
            id=f.UniqueId, hostRef=f.Id.Value.ToString(), kind=window?"window":"door",
            mark=StringParam(f, BuiltInParameter.ALL_MODEL_MARK), widthMm=width>0?width:null, heightMm=height>0?height:null,
            dimensionBasis="Nominal Revit family width/height", level=doc.GetElement(f.LevelId)?.Name??"",
            typeName=(f.Symbol?.FamilyName??"")+" / "+(f.Symbol?.Name??""), room=RoomName(f,window),
            sillMm=window?Length(f,BuiltInParameter.INSTANCE_SILL_HEIGHT_PARAM,false):null,
            notes=StringParam(f,BuiltInParameter.ALL_MODEL_INSTANCE_COMMENTS),
            operation="",material="",glazing="",orientation="",handing="",series="",colour="",hardware="",manufacturer="",sku=""
        };
    }
    internal static Result Launch(ExternalCommandData data, bool selection)
    {
        UIDocument? ui = data.Application.ActiveUIDocument;
        if(ui == null || ui.Document.IsFamilyDocument) { TaskDialog.Show("WinMatch","Open a Revit project first."); return Result.Cancelled; }
        Document doc = ui.Document;
        IEnumerable<FamilyInstance> items = selection
            ? ui.Selection.GetElementIds().Select(id=>doc.GetElement(id)).OfType<FamilyInstance>().Where(IsOpening)
            : Openings(doc);
        var rows = items.OrderBy(f=>f.Id.Value).Select(f=>Row(doc,f)).ToArray();
        var walls=selection?ui.Selection.GetElementIds().Select(id=>doc.GetElement(id)).OfType<Wall>():new FilteredElementCollector(doc).OfClass(typeof(Wall)).Cast<Wall>();
        var curtainWalls=walls.Where(w=>w.CurtainGrid!=null).Select(w=>{
            var grid=w.CurtainGrid!;
            double? width=w.Location is LocationCurve lc?Math.Round(UnitUtils.ConvertFromInternalUnits(lc.Curve.Length,UnitTypeId.Millimeters),2):null;
            var hp=w.get_Parameter(BuiltInParameter.WALL_USER_HEIGHT_PARAM);
            double? height=hp!=null&&hp.HasValue&&hp.StorageType==StorageType.Double?Math.Round(UnitUtils.ConvertFromInternalUnits(hp.AsDouble(),UnitTypeId.Millimeters),2):null;
            return new {id=w.UniqueId,mark=StringParam(w,BuiltInParameter.ALL_MODEL_MARK),typeName=w.WallType.Name,level=doc.GetElement(w.LevelId)?.Name??"",modelWidthMm=width,modelHeightMm=height,panels=grid.GetPanelIds().Count,mullions=grid.GetMullionIds().Count,uLines=grid.NumULines,vLines=grid.NumVLines};
        }).ToArray();
        if(rows.Length==0&&curtainWalls.Length==0) { TaskDialog.Show("WinMatch","No windows, doors or curtain walls found in the requested scope."); return Result.Cancelled; }
        var snapshot=new {
            schemaVersion=Version, source="Revit", projectId=ProjectKey(doc), projectName=doc.Title,
            capturedAt=DateTime.UtcNow.ToString("O"), hostVersion=doc.Application.VersionNumber,
            siteContext=new {latitude=doc.SiteLocation.Latitude*180/Math.PI,longitude=doc.SiteLocation.Longitude*180/Math.PI,siteNotes="Coordinates from Revit SiteLocation; confirm project settings.",northBearing=0}, curtainWalls,
            warnings=new[]{selection?"Selection only: revision comparisons require equivalent scan scopes.":"Active document only: linked model elements are excluded; curtain walls are summarised separately.",
                "Family dimensions and room assignments depend on model parameters. Verify dimension basis and room/phase."}, openings=rows
        };
        string json=JsonSerializer.Serialize(snapshot,Options);
        // Default System.Text.Json encoder escapes HTML-sensitive characters, preventing script injection.
        string dir=Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location)!;
        string template=File.ReadAllText(Path.Combine(dir,"WinMatch-BIM-Studio.html"));
        const string marker="const EMBEDDED = null;";
        if(!template.Contains(marker)) throw new InvalidOperationException("Studio template is invalid.");
        string destination=Path.Combine(Path.GetTempPath(),"WinMatchBIM",Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(destination);
        string html=Path.Combine(destination,"WinMatch-BIM-Studio.html");
        File.WriteAllText(Path.Combine(destination,"snapshot.json"),json);
        File.WriteAllText(html,template.Replace(marker,"const EMBEDDED = "+json+";"));
        Process.Start(new ProcessStartInfo(html){UseShellExecute=true});
        return Result.Succeeded;
    }
    internal static T? Read<T>(string title)
    {
        var picker=new OpenFileDialog {Title=title,Filter="WinMatch JSON (*.json)|*.json",Multiselect=false};
        if(picker.ShowDialog()!=true)return default;
        if(new FileInfo(picker.FileName).Length>10_000_000)throw new InvalidDataException("Patch file exceeds 10 MB.");
        return JsonSerializer.Deserialize<T>(File.ReadAllText(picker.FileName),Options);
    }
}
[Transaction(TransactionMode.ReadOnly)]
public class OpenStudio : IExternalCommand
{
    public Result Execute(ExternalCommandData data, ref string message, ElementSet elements) {try{return Bridge.Launch(data,false);}catch(Exception e){message=e.Message;return Result.Failed;}}
}
[Transaction(TransactionMode.ReadOnly)]
public class OpenSelection : IExternalCommand
{
    public Result Execute(ExternalCommandData data, ref string message, ElementSet elements) {try{return Bridge.Launch(data,true);}catch(Exception e){message=e.Message;return Result.Failed;}}
}
[Transaction(TransactionMode.ReadOnly)]
public class LocateOpenings : IExternalCommand
{
    public Result Execute(ExternalCommandData data,ref string message,ElementSet elements)
    {
        try {
            var ui=data.Application.ActiveUIDocument;
            if(ui==null)return Result.Cancelled;
            var form=new System.Windows.Window{Title="WinMatch · locate by mark",Width=360,Height=170,WindowStartupLocation=System.Windows.WindowStartupLocation.CenterScreen,ResizeMode=System.Windows.ResizeMode.NoResize};
            var p=new System.Windows.Controls.StackPanel{Margin=new System.Windows.Thickness(16)};
            p.Children.Add(new System.Windows.Controls.TextBlock{Text="Enter the exact window or door mark."});
            var box=new System.Windows.Controls.TextBox{Margin=new System.Windows.Thickness(0,10,0,10)};p.Children.Add(box);
            var go=new System.Windows.Controls.Button{Content="Locate openings",IsDefault=true};go.Click+=(s,e)=>form.DialogResult=true;p.Children.Add(go);form.Content=p;
            if(form.ShowDialog()!=true||string.IsNullOrWhiteSpace(box.Text))return Result.Cancelled;
            var ids=Bridge.Openings(ui.Document).Where(f=>string.Equals(Bridge.StringParam(f,BuiltInParameter.ALL_MODEL_MARK),box.Text.Trim(),StringComparison.OrdinalIgnoreCase)).Select(f=>f.Id).ToList();
            if(ids.Count==0){TaskDialog.Show("WinMatch","No matching marks.");return Result.Cancelled;}
            ui.Selection.SetElementIds(ids);
            try{ui.ShowElements(ids);}catch{TaskDialog.Show("WinMatch","Selected "+ids.Count+" opening(s). Some may not be visible in the current view.");}
            return Result.Succeeded;
        }catch(Exception e){message=e.Message;return Result.Failed;}
    }
}
public record MarkChange(string Id,string ExpectedMark,string NewMark);
public record MarkPatch(string SchemaVersion,string PatchType,string Source,string ProjectId,List<MarkChange> Changes);

[Transaction(TransactionMode.Manual)]
public class ApplyMarks : IExternalCommand
{
    public Result Execute(ExternalCommandData data,ref string message,ElementSet elements)
    {
        try{
            var ui=data.Application.ActiveUIDocument;
            if(ui==null||ui.Document.IsFamilyDocument)return Result.Cancelled;
            var doc=ui.Document;
            var patch=Bridge.Read<MarkPatch>("Select WinMatch mark-update JSON");
            if(patch==null)return Result.Cancelled;
            if(patch.SchemaVersion!=Bridge.Version||patch.PatchType!="mark-update"||patch.Source!="Revit"||patch.ProjectId!=Bridge.ProjectKey(doc))
                throw new InvalidDataException("Patch does not match this Revit project and schema.");
            if(patch.Changes==null||patch.Changes.Count==0||patch.Changes.Count>10000)throw new InvalidDataException("Patch contains no changes or exceeds the 10,000 mark limit.");
            var seen=new HashSet<string>(StringComparer.Ordinal);
            var updates=new List<(Parameter parameter,string value)>();
            foreach(var change in patch.Changes){
                if(change==null||string.IsNullOrWhiteSpace(change.Id)||!seen.Add(change.Id)||string.IsNullOrWhiteSpace(change.NewMark)||change.NewMark.Length>255||change.ExpectedMark==null)
                    throw new InvalidDataException("Invalid or duplicate mark change. Nothing applied.");
                if(doc.GetElement(change.Id) is not FamilyInstance f||!Bridge.IsOpening(f))throw new InvalidDataException("Opening missing: "+change.Id);
                var p=f.get_Parameter(BuiltInParameter.ALL_MODEL_MARK);
                if(p==null||p.IsReadOnly||p.StorageType!=StorageType.String)throw new InvalidDataException("Mark cannot be edited: "+change.Id);
                if(!string.Equals((p.AsString()??"").Trim(),change.ExpectedMark,StringComparison.Ordinal))
                    throw new InvalidDataException("Mark changed since scan. Rescan the model; nothing applied.");
                updates.Add((p,change.NewMark.Trim()));
            }
            string preview=string.Join("\n",patch.Changes.Take(12).Select(c=>$"{(c.ExpectedMark==""?"(blank)":c.ExpectedMark)} → {c.NewMark}"));
            var confirm=new TaskDialog("WinMatch · approve mark updates"){MainInstruction=$"Apply {updates.Count} mark change(s)?",MainContent=preview+(updates.Count>12?$"\n… and {updates.Count-12} more.":"")+"\n\nExisting IDs can be repeated. Review the full patch before confirming. Revit Undo can reverse the transaction.",CommonButtons=TaskDialogCommonButtons.Ok|TaskDialogCommonButtons.Cancel,DefaultButton=TaskDialogResult.Cancel};
            if(confirm.Show()!=TaskDialogResult.Ok)return Result.Cancelled;
            using var tx=new Transaction(doc,"WinMatch: apply opening marks");
            tx.Start();
            try{
                foreach(var (p,value) in updates)if(!p.Set(value))throw new InvalidOperationException("A mark was rejected by Revit.");
                if(tx.Commit()!=TransactionStatus.Committed)throw new InvalidOperationException("Revit did not commit the transaction.");
            }catch{if(tx.GetStatus()==TransactionStatus.Started)tx.RollBack();throw;}
            TaskDialog.Show("WinMatch",$"{updates.Count} marks updated. Scan again to confirm.");
            return Result.Succeeded;
        }catch(Exception e){message=e.Message;return Result.Failed;}
    }
}

[Transaction(TransactionMode.Manual)]
public class LoadFamilies : IExternalCommand
{
    public Result Execute(ExternalCommandData data,ref string message,ElementSet elements)
    {
        try{
            var ui=data.Application.ActiveUIDocument;
            if(ui==null||ui.Document.IsFamilyDocument)return Result.Cancelled;
            var doc=ui.Document;
            var picker=new OpenFileDialog{Title="Select approved manufacturer RFA window and door families",Filter="Revit family (*.rfa)|*.rfa",Multiselect=true};
            if(picker.ShowDialog()!=true)return Result.Cancelled;
            var files=picker.FileNames;
            if(files.Length==0||files.Length>100)throw new InvalidDataException("Select 1–100 local Revit families.");
            var confirm=new TaskDialog("WinMatch · import manufacturer families"){
                MainInstruction=$"Load {files.Length} family file(s) into {doc.Title}?",
                MainContent="Only window and door families are accepted. Existing families will not be intentionally overwritten. This loads definitions only; it does not place or resize openings. Use trusted manufacturer files compatible with this Revit version.",
                CommonButtons=TaskDialogCommonButtons.Ok|TaskDialogCommonButtons.Cancel,DefaultButton=TaskDialogResult.Cancel
            };
            if(confirm.Show()!=TaskDialogResult.Ok)return Result.Cancelled;
            var existing=new FilteredElementCollector(doc).OfClass(typeof(Family)).Cast<Family>().Select(f=>f.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);
            using var tx=new Transaction(doc,"WinMatch: import manufacturer library");
            tx.Start();
            try{
                foreach(string path in files){
                    if(existing.Contains(Path.GetFileNameWithoutExtension(path)))throw new InvalidOperationException("Family already exists: "+Path.GetFileNameWithoutExtension(path));
                    if(!doc.LoadFamily(path,new NoOverwriteFamilyOptions(),out Family family)||family==null)throw new InvalidOperationException("Revit did not load "+Path.GetFileName(path));
                    long? category=family.FamilyCategory?.Id.Value;
                    if(category!=(long)BuiltInCategory.OST_Windows&&category!=(long)BuiltInCategory.OST_Doors)throw new InvalidOperationException("Not a window or door family: "+family.Name);
                    existing.Add(family.Name);
                }
                if(tx.Commit()!=TransactionStatus.Committed)throw new InvalidOperationException("Revit did not commit the family import.");
            }catch{if(tx.GetStatus()==TransactionStatus.Started)tx.RollBack();throw;}
            TaskDialog.Show("WinMatch",$"Loaded {files.Length} manufacturer family definition(s). Use Revit's native window or door tools to place them.");
            return Result.Succeeded;
        }catch(Exception e){message=e.Message;return Result.Failed;}
    }
    private sealed class NoOverwriteFamilyOptions : IFamilyLoadOptions
    {
        public bool OnFamilyFound(bool familyInUse,out bool overwriteParameterValues){overwriteParameterValues=false;return false;}
        public bool OnSharedFamilyFound(Family sharedFamily,bool familyInUse,out FamilySource source,out bool overwriteParameterValues){source=FamilySource.Project;overwriteParameterValues=false;return false;}
    }
}

[Transaction(TransactionMode.Manual)]
public class AutoTagViews : IExternalCommand
{
    private record Choice(View View) { public override string ToString() => $"{View.ViewType} | {View.Name}"; }
    public Result Execute(ExternalCommandData data,ref string message,ElementSet elements)
    {
        try {
            var ui=data.Application.ActiveUIDocument;
            if(ui==null||ui.Document.IsFamilyDocument)return Result.Cancelled;
            var doc=ui.Document;
            var choices=new FilteredElementCollector(doc).OfClass(typeof(View)).Cast<View>()
                .Where(v=>!v.IsTemplate&&(v.ViewType==ViewType.FloorPlan||v.ViewType==ViewType.Elevation))
                .OrderBy(v=>v.ViewType).ThenBy(v=>v.Name).Select(v=>new Choice(v)).ToArray();
            if(choices.Length==0){TaskDialog.Show("WinMatch","No eligible floor-plan or elevation views.");return Result.Cancelled;}
            var dialog=new System.Windows.Window{Title="WinMatch · auto-tag openings",Width=560,Height=540,WindowStartupLocation=System.Windows.WindowStartupLocation.CenterScreen};
            var root=new System.Windows.Controls.DockPanel{Margin=new System.Windows.Thickness(16)};
            var prompt=new System.Windows.Controls.TextBlock{Text="Select floor plans, elevations or both. Existing tags and blank marks will be skipped. Load your preferred mark tag families first.",TextWrapping=System.Windows.TextWrapping.Wrap,Margin=new System.Windows.Thickness(0,0,0,12)};
            System.Windows.Controls.DockPanel.SetDock(prompt,System.Windows.Controls.Dock.Top);root.Children.Add(prompt);
            var list=new System.Windows.Controls.ListBox{SelectionMode=System.Windows.Controls.SelectionMode.Extended,ItemsSource=choices};
            var toolbar=new System.Windows.Controls.WrapPanel{Margin=new System.Windows.Thickness(0,0,0,8)};
            void Pick(Func<Choice,bool> select){list.UnselectAll();foreach(var v in choices.Where(select))list.SelectedItems.Add(v);}
            void AddChoiceButton(string label,System.Action click){var b=new System.Windows.Controls.Button{Content=label,Margin=new System.Windows.Thickness(2),Padding=new System.Windows.Thickness(6)};b.Click+=(sender,args)=>click();toolbar.Children.Add(b);}
            AddChoiceButton("Floor plans",()=>Pick(v=>v.View.ViewType==ViewType.FloorPlan));
            AddChoiceButton("Elevations",()=>Pick(v=>v.View.ViewType==ViewType.Elevation));
            AddChoiceButton("Both",()=>Pick(v=>true));
            AddChoiceButton("Active view",()=>Pick(v=>v.View.Id==ui.ActiveView.Id));
            System.Windows.Controls.DockPanel.SetDock(toolbar,System.Windows.Controls.Dock.Top);root.Children.Add(toolbar);
            var bottom=new System.Windows.Controls.Button{Content="Preview tags",IsDefault=true,Padding=new System.Windows.Thickness(8),Margin=new System.Windows.Thickness(0,10,0,0)};
            bottom.Click+=(a,b)=>dialog.DialogResult=true;System.Windows.Controls.DockPanel.SetDock(bottom,System.Windows.Controls.Dock.Bottom);root.Children.Add(bottom);root.Children.Add(list);
            dialog.Content=root;Pick(v=>v.View.Id==ui.ActiveView.Id);
            if(dialog.ShowDialog()!=true||list.SelectedItems.Count==0)return Result.Cancelled;
            var selected=list.SelectedItems.Cast<Choice>().Select(c=>c.View).ToArray();
            var pending=new List<(View view,FamilyInstance element,XYZ point)>();
            int skipped=0;
            foreach(var view in selected){
                var existing=new FilteredElementCollector(doc).OwnedByView(view.Id).OfClass(typeof(IndependentTag)).Cast<IndependentTag>()
                    .SelectMany(t=>t.GetTaggedLocalElementIds()).ToHashSet();
                var openings=new FilteredElementCollector(doc,view.Id).OfClass(typeof(FamilyInstance)).Cast<FamilyInstance>().Where(Bridge.IsOpening);
                foreach(var f in openings){
                    if(existing.Contains(f.Id)||string.IsNullOrWhiteSpace(Bridge.StringParam(f,BuiltInParameter.ALL_MODEL_MARK))){skipped++;continue;}
                    var bbox=f.get_BoundingBox(view);
                    XYZ? centre=bbox!=null?bbox.Transform.OfPoint((bbox.Min+bbox.Max)*0.5):(f.Location as LocationPoint)?.Point;
                    if(centre==null){skipped++;continue;}
                    // Paper-space offset: 4 mm above the approximate model centre.
                    var offset=UnitUtils.ConvertToInternalUnits(4*Math.Max(view.Scale,1),UnitTypeId.Millimeters);
                    pending.Add((view,f,centre+view.UpDirection*offset));
                }
            }
            if(pending.Count==0){TaskDialog.Show("WinMatch",$"No new tag candidates. Skipped {skipped} existing, blank or unavailable references.");return Result.Cancelled;}
            var approve=new TaskDialog("WinMatch · approve auto-tagging"){MainInstruction=$"Create {pending.Count} tags in {selected.Length} view(s)?",MainContent=$"Skipped {skipped} existing tags, blank marks or unavailable positions. Uses the loaded category tag type with an approximate paper-space offset; check crowding and tag contents. Undo can reverse the transaction.",CommonButtons=TaskDialogCommonButtons.Ok|TaskDialogCommonButtons.Cancel,DefaultButton=TaskDialogResult.Cancel};
            if(approve.Show()!=TaskDialogResult.Ok)return Result.Cancelled;
            using var tx=new Transaction(doc,"WinMatch: auto-tag openings");tx.Start();
            try{
                foreach(var (view,element,point) in pending)
                    IndependentTag.Create(doc,view.Id,new Reference(element),false,TagMode.TM_ADDBY_CATEGORY,TagOrientation.Horizontal,point);
                if(tx.Commit()!=TransactionStatus.Committed)throw new InvalidOperationException("Tag transaction did not commit.");
            }catch{if(tx.GetStatus()==TransactionStatus.Started)tx.RollBack();throw;}
            TaskDialog.Show("WinMatch",$"Created {pending.Count} tag(s). Review graphics and annotation placement in each selected view.");
            return Result.Succeeded;
        }catch(Exception e){message=e.Message;return Result.Failed;}
    }
}

[Transaction(TransactionMode.Manual)]
public class ExportIFC : IExternalCommand
{
    public Result Execute(ExternalCommandData data,ref string message,ElementSet elements)
    {
        try{
            var ui=data.Application.ActiveUIDocument;
            if(ui==null||ui.Document.IsFamilyDocument)return Result.Cancelled;
            var doc=ui.Document;
            var picker=new SaveFileDialog{Title="Export IFC for WinMatch",Filter="IFC model (*.ifc)|*.ifc",DefaultExt=".ifc",AddExtension=true,OverwritePrompt=true,FileName=doc.Title+".ifc"};
            if(picker.ShowDialog()!=true)return Result.Cancelled;
            var options=new IFCExportOptions{FileVersion=IFCVersion.IFC4,ExportBaseQuantities=true};
            using var tx=new Transaction(doc,"WinMatch: IFC export");tx.Start();
            try{
                bool exported=doc.Export(Path.GetDirectoryName(picker.FileName)!,Path.GetFileName(picker.FileName),options);
                // Do not persist incidental exporter changes to the source model.
                tx.RollBack();
                if(!exported)throw new InvalidOperationException("Revit IFC exporter reported failure.");
            }catch{if(tx.GetStatus()==TransactionStatus.Started)tx.RollBack();throw;}
            TaskDialog.Show("WinMatch","IFC exported. Use the repository's IFC reader to create a WinMatch snapshot. Retain the export configuration and verify IFC GlobalIds across revisions.");
            return Result.Succeeded;
        }catch(Exception e){message=e.Message;return Result.Failed;}
    }
}
