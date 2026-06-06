# DrivePK Bolo App V2

Clean V2 browser-testing build for DrivePK Bolo POST VEHICLE.

## Purpose

This version removes the unstable Android browser `SpeechRecognition` flow from POST VEHICLE.

POST VEHICLE now works like this:

1. User saves seller profile in the browser.
2. User opens POST VEHICLE.
3. App plays a short Urdu/Roman Urdu guide using `voice.php`.
4. User records real audio with `MediaRecorder`.
5. Audio uploads to Bluehost endpoint `transcribe.php`.
6. Server sends audio to OpenAI transcription.
7. Returned transcript is parsed into vehicle fields.
8. User checks the form and posts the vehicle.
9. Vehicle is saved in browser `localStorage` for testing.
10. After 10 minutes, user must mark vehicle as `Sold` or `Still Available` before posting another vehicle.

## Files

- `index.html` - app structure
- `styles.css` - DrivePK red/black/white UI
- `config.js` - endpoints and expiry setting
- `app.js` - app logic, MediaRecorder, parsing, reminders, search
- `README.md` - setup notes

## Config

Edit `config.js` if needed:

```js
window.DRIVEPK_BOLO_CONFIG = {
  TRANSCRIBE_URL: 'https://meilibeauty.co.uk/transcribe.php',
  VOICE_URL: 'https://meilibeauty.co.uk/voice.php',
  EXPIRY_MINUTES: 10
};
```

## Current rules

- POST VEHICLE uses server transcription only.
- Browser `SpeechRecognition` is not used for posting.
- Typed search is included first.
- Voice search should be added later as a separate module only after POST VEHICLE is stable.
- Seller phone and WhatsApp come from browser profile, not from the vehicle form.
- Price and city are required and clearly shown in each advert.
- If any active vehicle becomes due for confirmation, posting is blocked.
- Clicking `Still Available` extends the vehicle for another 10 minutes.
- Clicking `Sold` marks the vehicle inactive.

## Bluehost server files required

Secure key file outside public folder:

```text
/home4/helpninn/openai_key.php
```

Public endpoints:

```text
/home4/helpninn/public_html/meilibeautyco/transcribe.php
/home4/helpninn/public_html/meilibeautyco/voice.php
```

Frontend endpoints used by this app:

```text
https://meilibeauty.co.uk/transcribe.php
https://meilibeauty.co.uk/voice.php
```

## Security notes

Do not put the OpenAI API key inside:

- GitHub
- `index.html`
- `app.js`
- `config.js`
- `public_html`

Keep the API key only in:

```text
/home4/helpninn/openai_key.php
```

If any real key was shared in chat, screenshots, or GitHub, revoke it and create a new key.

## Testing checklist

1. Open app on Android Chrome.
2. Save profile with name and phone.
3. Open POST VEHICLE.
4. Tap Start Recording.
5. Speak: “Toyota Yaris 2022 white color Lahore city Islamabad registered 45000 mileage price 45 lakh.”
6. Tap Stop Recording.
7. Confirm transcript appears.
8. Confirm Make, Model, Year, Price, City, Color, Registered In, Mileage are filled.
9. Submit vehicle.
10. Wait 10 minutes.
11. Confirm app blocks new posting until Sold / Still Available is clicked.

## Development note

This is still a browser-storage testing build. For final launch, move profile, vehicles, OTP, reminders, and lock state to a server database.

