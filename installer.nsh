Function DetectJRE
	StrCpy $1 "SOFTWARE\JavaSoft\Java Runtime Environment"  
	StrCpy $2 0  
	ReadRegStr $2 HKLM "$1" "CurrentVersion"  
	StrCmp $2 "" DetectTry2   
	ReadRegStr $5 HKLM "$1\$2" "JavaHome"  
	StrCmp $5 "" DetectTry2  
	goto done  

	DetectTry2:  
	ReadRegStr $2 HKLM "SOFTWARE\JavaSoft\Java Development Kit" "CurrentVersion"  
	StrCmp $2 "" NoJava  
	ReadRegStr $5 HKLM "SOFTWARE\JavaSoft\Java Development Kit\$2" "JavaHome"  
	StrCmp $5 "" NoJava done  

done:  
	StrCmp $2 "1.8" ff NoJava

ff:
	Return
  

doneSix:  
	StrCmp $2 "1.8" ff NoJavaf
	Return

NoJava:  
	Goto DetectJRESix

DetectJRESix:
	StrCpy $1 "SOFTWARE\WOW6432Node\JavaSoft\Java Runtime Environment"  
	StrCpy $2 0  
	ReadRegStr $2 HKLM "$1" "CurrentVersion"  
	StrCmp $2 "" DetectTry3   
	ReadRegStr $5 HKLM "$1\$2" "JavaHome"  
	StrCmp $5 "" DetectTry3  
	goto doneSix  

	DetectTry3:  
	ReadRegStr $2 HKLM "SOFTWARE\WOW6432Node\JavaSoft\Java Development Kit" "CurrentVersion"  
	StrCmp $2 "" NoJavaf  
	ReadRegStr $5 HKLM "SOFTWARE\WOW6432Node\JavaSoft\Java Development Kit\$2" "JavaHome"  
	StrCmp $5 "" NoJavaf doneSix  

NoJavaf:  
	ExecWait "$INSTDIR\jre-8u261-windows-i586.exe"


FunctionEnd


!macro customInstall
	call DetectJRE
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "driver" '"$INSTDIR\ob\driver.jar"'
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "init" '"$INSTDIR\ob\init.jar"'
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "TeamOB" '"$INSTDIR\TeamOB.exe"'

	ExecWait "$INSTDIR\ob\addtask.bat"

!macroend


!macro customUnInstall
	DeleteRegValue HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "driver"
	DeleteRegValue HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "init"
	DeleteRegValue HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "TeamOB"
!macroend