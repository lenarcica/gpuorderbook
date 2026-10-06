# Run this esbuild command, if instlaled to compile packages from widget_src/static directories into an "outwidget" folder

esbuild --bundle --format=esm --define:DEBUG=true --outdir=outwidget/static widget_src/widget_index.js




esbuild --bundle --format=esm --define:DEBUG=true --outdir=outwidget/verify_levs static/internal/ord_algo/verify_levs.js


esbuild --bundle --format=esm --define:DEBUG=true --outdir=outwidget/ord_algo static/internal/ord_algo/ord_algo.js


esbuild --bundle --format=esm --define:DEBUG=true --outdir=outwidget/sip_algo static/internal/ord_algo/sip_algo.js


esbuild --bundle --format=esm --define:DEBUG=true --outdir=outwidget/cumulate static/internal/ord_algo/cumulate.js

esbuild --bundle --format=esm --define:DEBUG=true --outdir=outwidget/ord_algo static/internal/ord_algo/app.js


