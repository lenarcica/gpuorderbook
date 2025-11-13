# Internal Libraries
These libraries could be adapted potentially to other projects independent of the widget.

1. pretty_num.js
  This is made to fix for a lack of default "Pretty Format" that scales past Javascript defaults (depending on technology millisecond or microsecond might be max resolution)

   By setting a default "unit time", the Pretty num operations will calculate baseline break points, and translate timestamps from some
   sort of floating point number (with "1.0" being a unit difference), and varying that amount from a default baseline timestamp
   (say a timestmap of 13:30:59.999093000 and all units being nanosecond departures from that time.)
