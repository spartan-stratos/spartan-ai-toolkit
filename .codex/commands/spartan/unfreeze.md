---
name: spartan:unfreeze
description: Remove the directory edit lock set by /spartan:freeze. Claude can edit files anywhere again.
---

# Unfreeze — Directory Lock Removed

Freeze mode is now **OFF**. Claude can edit files in any directory.

If guard mode was active (`/spartan:guard`), only the freeze portion is removed — careful mode remains active.

Claude should acknowledge:
"🧊 Freeze OFF — tôi có thể edit files ở bất kỳ đâu. Careful mode vẫn {{ 'ON' if careful_active else 'OFF' }}."
