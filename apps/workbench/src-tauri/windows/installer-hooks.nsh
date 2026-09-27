!macro NSIS_HOOK_PREUNINSTALL
  IfSilent SeekwdKeepAppData
  MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 "Delete all locally stored Seekwd data, including canvases, settings, and run history?$\r$\n$\r$\nChoose No to keep this data so it can be reused if you install Seekwd again. Files in folders you selected as workspaces are not deleted." IDYES SeekwdDeleteAppData
  Goto SeekwdKeepAppData

  SeekwdDeleteAppData:
    RMDir /r "$APPDATA\com.seekwd.workbench"
    RMDir /r "$LOCALAPPDATA\com.seekwd.workbench"
    Goto SeekwdUninstallDone

  SeekwdKeepAppData:
  SeekwdUninstallDone:
!macroend
