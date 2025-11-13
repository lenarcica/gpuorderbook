# Run this esbuild command, if instlaled to compile packages from widget_src/static directories into an "outwidget" folder

esbuild --bundle --format=esm --outdir=outwidget/static widget_src/widget_index.js
