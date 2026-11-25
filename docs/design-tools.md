# Curtain wall and site climate tools

## Curtain wall

The Revit connector reads separate curtain wall summaries: stable wall ID, mark, type, level, location-curve length, unconnected-height parameter, grid counts, panel count and mullion count. Neither curve length nor unconnected height is a guarantee of real panel geometry. Detailed curtain systems, shaped/sloped curtain walls and curtain panel geometry are not extracted.

The standalone rectangular design tool can start with manually entered unequal column widths and row heights (1–20 bays each). Click a module and assign glazing, spandrel, operable, door or opaque. The panel register uses module centreline intervals, not net glass dimensions. Gross area is width × height, internal theoretical grid length is (columns − 1) × height + (rows − 1) × width, perimeter is twice the width-plus-height. Export panel CSV or layout JSON. There is no machining, structural, wind pressure, system-selection, or native geometry change functionality.

## Site climate

The solar compass is an offline site-orientation sketch inspired by WinMatch's site climate workflow. Enter latitude, longitude, the bearing of model-up relative to true north, manual directional wind observations for summer/winter and site notes. Revit passes SiteLocation coordinates, which must be confirmed; bearing and other observations are set explicitly.

The seasonal solstice paths use declinations +/−23.44 degrees and a local solar hour angle of 15 degrees per hour from solar noon. Hemisphere determines which solstice is summer. The compass plots sun altitude radially and azimuth angularly; wind lines indicate origin direction only.

There is no actual weather retrieval, NatHERS climate zone, BOM wind region, topographic elevation, sea distance, AS/NZS wind-design pressure, clock-time/weather adjustment or thermal simulation in this preview. Latitude drives the path; longitude is recorded as site context, not used to compute civil time. The generated site-profile JSON is portable. Confirm all climate inputs from appropriate local sources for building design.
