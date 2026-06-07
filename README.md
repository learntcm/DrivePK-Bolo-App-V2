# DrivePK Bolo V2 - Native Search UI

This version keeps the database untouched and adds:

- Native DrivePK-style dark UI
- Real car search using `GET https://api.drivepk.com/cars`
- Voice search button with mic icon
- Typed search and quick filters
- Existing demo POST VEHICLE voice flow
- GPT-powered server response support for `vehicle_search` and `vehicle_post`

## Upload to GitHub repo root

Replace:

- `index.html`
- `styles.css`
- `config.js`
- `app.js`

## Server requirement

Your existing `transcribe.php` should support:

- `task=vehicle_post`
- `task=vehicle_search`

For search it should return either:

```json
{
  "transcript": "Toyota Corolla Lahore 2020 10 lakh to 30 lakh",
  "filters": {
    "brand": "Toyota",
    "model": "Corolla",
    "year": 2020,
    "minPrice": 1000000,
    "maxPrice": 3000000,
    "city": "Lahore"
  }
}
```

The frontend also includes a basic fallback parser, but GPT extraction is recommended.
