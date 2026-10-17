# Cap Stack Sort - Android / iOS source

The same local web game is bundled with Capacitor 8.5.3. Creator Studio and advertising SDKs are disabled. Assets launch without a network connection. The App plugin pauses the game/audio in the background; Android Back returns to the main menu and exits from the menu.

## Prepare

From the repository root (Node 22+):

```
npm ci
npm ci --prefix mobile
npm run sync --prefix mobile
```

Android: open `mobile/android` in Android Studio (JDK 21; compile/target SDK 36; minimum SDK 24). Debug builds use `com.arscorp.capstacksort.test`; production uses `com.arscorp.capstacksort`. In Android Studio use Build > Generate Signed App Bundle / APK > Android App Bundle. Create/choose your upload keystore, build `release`, and enable Play App Signing in the console. Keep the key and its passwords privately; they are excluded from git. Bump versionCode for each upload.

GitHub Actions compiles a debug APK and an unsigned release AAB. The APK is for device testing. The AAB still needs your upload-key signature; it is not a ready-to-upload signed store release. CI artifacts do not prove physical-device behavior.

For iOS, use a Mac with the Xcode version required by current Capacitor and Apple submission rules. Run sync, open `mobile/ios/App/App.xcodeproj`, select your Apple team, confirm bundle ID ownership, use automatic signing, test on a device, then Product > Archive > Distribute App > App Store Connect. TestFlight comes before the public release. Linux cannot run the iOS compiler.

The identifier is a chosen project default, not a registered developer account. Confirm availability before the first store upload. Store contact email, identity verification, contracts, banking, tax declarations, age-rating and privacy questionnaire answers belong to the owner. No credentials, accounts or production signing keys are included.

Native screenshots must be captured from the installed application or official simulators. Web screenshots in the publishing kit are browser references. Check touch dragging, sound, safe areas, background/foreground, Back, resume, offline cold launch, install and update on real devices.

No native advertising, purchases, account system or cross-device saves are implemented in this edition. Its privacy policy must change if those features are added.
