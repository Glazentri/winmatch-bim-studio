# Databuild QGen example project

A fictional training project and **job-variable carrier XML**, based on the user's Databuild Knowledge reference (DBW32.pdf, physical pp. 778–780, XML bill record and QGen variable import). Original documentation is not bundled.

This is not a Databuild database backup or a live company project. The sample uses dummy job 1, cost centre 900, carrier item 0001. **Replace them** with an existing zero-cost carrier bill item and correct test job in your own database before importing.

## Files

- `example-snapshot.json`: three fictitious openings with explicit sizes, reveal and accessory settings.
- `example-job-carrier.xml`: Databuild-shaped XML sample, one bill record, zero cost, explicit job number. The QGen field contains absolute variable assignments.
- `expected-variables.json`: expected output for checking the imported job.
- `example-workups.csv`: suggested QGen workups using the job variables; map to your company's actual item and cost centre codes.

## QGen syntax

Numeric assignments use `value^^[variable]`, not additive assignments, so a repeated import is intended to set the variables rather than accumulate them. Multiple variable expressions are separated by `[LF]`. Job variable names are short (within the documented 20-character limit). Item quantity formulas reference the relevant `[variable]`. The preview includes only numeric inputs; no untrusted macro text is inserted.

Use the current job's item mapping, review the resulting Bill, regenerate quantities according to your Databuild workflow, and compare the expected JSON values against Databuild before production use.

## Generate for your own project

In Studio complete unknown quantities, configure the measured-quantity basis and inclusions, open **Estimating bridges**, enter the target carrier details, download XML. Alternatively:

```bash
node scripts/export_databuild.cjs snapshot.json output.xml JOB COSTCENTRE ITEM 1
```

The exporter rejects incomplete measured area, reveal, lintel, or flashing quantities. Subsill totals include only entered subsill lengths; unspecified subsills are excluded from the total. Inspect whether subsills are required before issuing. Lintel extension in the sample is fictional (150 mm each end), not engineering guidance. Values are rounded to two decimals.

The shape and QGen syntax are based on the reference; actual Databuild 2.71 import behaviour, company price-file mappings, Bill Load behaviour and item macro execution have not been host-tested in this release.
