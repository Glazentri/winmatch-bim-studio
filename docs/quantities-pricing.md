# Dimensions, quantities and pricing

## Three size concepts

| Key | Meaning |
|---|---|
| Model width/height | The host's parameter value with recorded dimension basis. |
| Structural opening width/height | Confirmed opening size in the structural aperture, entered/mapped independently. |
| Actual unit width/height | Confirmed manufactured or specified unit dimensions, entered/mapped independently. |

Enter subsill depth, height and length, reveal depth and the confirmed sizes in the opening detail panel or map compatible Archicad length properties. No allowance is automatically deducted from one size to obtain another. Explicit unknowns are represented as null. The opening detail schedule and manufacturer mapping retain all separate size concepts.

## Measured quantities

Select the dimension basis for the quantities register. Missing dimensions at the selected basis remain unknown rather than falling back to another size. The opening register summary is nominal model area.

All dimensions are mm. The output is m² or lm:

- Area: width × height / 1,000,000.
- Reveals: auto uses two jambs plus head and sill on windows, two jambs plus head on doors. Choose no reveals, head only, jambs only, three or four edges. Multiply selected length by 1 + waste/100.
- Lintel: when explicitly included, (width + 2 × user-entered end extension) / 1,000. Default extension is zero and lintels start excluded. This is not an engineering bearing recommendation.
- Head flashing: when explicitly included, (width + 2 × extension) / 1,000 × (1 + waste/100). Initial estimating assumptions are 300 mm each side and 20% waste; flashings start excluded. Overlap, continuous runs, cross sections and installation details require separate review.
- Subsill: explicitly entered length only; not inferred from width. The Databuild example sums provided lengths and excludes unset entries.

Quantities are estimates, not purchasing approvals or compliance checks. Use the manufacturer's size convention and engineer's project details.

## Pricing

Enter a supply rate per opening or per m² of the selected quantity basis. Enter optional installation per opening. Global accessory rates are per lm of calculated quantities. Monetary amounts are local schedule data, not BIM type parameter writes.

Supply = supply rate × relevant quantity. Cost = supply + installation + accessories. Sell ex tax = cost × (1 + markup / 100). Sell incl tax = sell ex tax × (1 + tax / 100).

Zero accessory rates and blank installation are intentionally excluded; unpriced supply and unknown quantities needed by a non-zero rate yield incomplete totals. Complete and incomplete rows are distinguished in the pricing summary. Currency is selected explicitly with no exchange conversion. Do not confuse markup with gross margin. No market rates or GST assumptions are asserted; input the applicable rates.
