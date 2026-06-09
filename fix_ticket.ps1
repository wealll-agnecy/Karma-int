$content = Get-Content "backend\controllers\ticketController.js" -Raw
$content = $content -replace "Server Error during addon status update' \}\);\n    \}\n\};\nexports.getMyScans = async", "Server Error during addon status update' });`n    }`n};`n`nexports.getMyScans = async"
$content = $content -replace "Server Error`" \}\);\n    \}\n\};`" \}\);\n    \}\n\};", "Server Error`" });`n    }`n};"
Set-Content "backend\controllers\ticketController.js" $content
