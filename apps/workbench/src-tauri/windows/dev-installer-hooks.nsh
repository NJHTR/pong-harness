!macro NSIS_HOOK_PREUNINSTALL
  RMDir /r "$INSTDIR\data"
!macroend
