

## GPS Range Update: 1m to 1km

Change the GPS range slider minimum from 50m to 1m in `src/pages/OwnerSettings.tsx`.

### Changes
**File: `src/pages/OwnerSettings.tsx`**
- Update Slider `min` from `50` to `1`
- Update step to `1` (for fine control at low ranges)
- Update the bottom label from "50m" to "1m"

Single-file, 3-line change.

