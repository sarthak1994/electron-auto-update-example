!macro preInit
 SetRegView 64
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "C:\app\appname"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "C:\app\appname"
 SetRegView 32
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "C:\app\appname"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "C:\app\appname"
!macroend

!macro customInstall
  DetailPrint "Register appname URI Handler"
  DeleteRegKey HKCR "appname"
  WriteRegStr HKCR "appname" "" "URL:appname"
  WriteRegStr HKCR "appname" "URL Protocol" ""
  WriteRegStr HKCR "appname\DefaultIcon" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
  WriteRegStr HKCR "appname\shell" "" ""
  WriteRegStr HKCR "appname\shell\Open" "" ""
  WriteRegStr HKCR "appname\shell\Open\command" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME} %1"
!macroend