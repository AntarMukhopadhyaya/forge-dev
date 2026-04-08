Output demo.gif

Set Shell "powershell"
Set FontSize 16
Set Width 1400
Set Height 820
Set Theme "Dracula"
Set TypingSpeed 85

Type "cd .."
Enter
Sleep 1s

Type "npx --yes @antardev/forge-dev@latest list"
Enter
Sleep 4s

Type "npx --yes @antardev/forge-dev@latest -V"
Enter
Sleep 2s

Type "npx --yes @antardev/forge-dev@latest init ens my-ens-app --yes"
Enter
Sleep 10s
