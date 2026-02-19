$adb = "C:\Users\nicol\AppData\Local\Android\Sdk\platform-tools\adb.exe"
Write-Host "Capturing Screen 1 (Home)..."
& $adb -s emulator-5554 shell screencap -p /sdcard/screen1.png
& $adb -s emulator-5554 pull /sdcard/screen1.png captured_screen_1.png

Write-Host "Tapping Bottom Center (Action)..."
& $adb -s emulator-5554 shell input tap 540 1900
Start-Sleep -Seconds 5

Write-Host "Capturing Screen 2..."
& $adb -s emulator-5554 shell screencap -p /sdcard/screen2.png
& $adb -s emulator-5554 pull /sdcard/screen2.png captured_screen_2.png

Write-Host "Tapping Top Left (Menu/Settings)..."
& $adb -s emulator-5554 shell input tap 100 150
Start-Sleep -Seconds 5

Write-Host "Capturing Screen 3..."
& $adb -s emulator-5554 shell screencap -p /sdcard/screen3.png
& $adb -s emulator-5554 pull /sdcard/screen3.png captured_screen_3.png

Write-Host "Done!"
