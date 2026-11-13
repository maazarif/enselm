from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parent.parent
files = [root/name for name in ('README.md','package.json','package-lock.json','drizzle.config.ts')]
for folder in ('docs','tests','scripts','backend','db','drizzle'):
    files += sorted(path for path in (root/folder).rglob('*') if path.is_file() and path.suffix in ('.md','.cjs','.mjs','.py','.sql','.ts','.json'))
files += [root/'dist'/name for name in ('index.html','styles.css','app.js','core.js','relay.js')]
files += sorted(path for path in (root/'dist/fonts').rglob('*') if path.is_file())
with ZipFile(root/'dist/enselm-source.zip', 'w', ZIP_DEFLATED) as archive:
    for path in files:
        archive.write(path, 'enselm/'+str(path.relative_to(root)))
    archive.writestr('enselm/.openai/hosting.json','{"d1":"DB","r2":null}\n')
print('Source archive created:', (root/'dist/enselm-source.zip').stat().st_size, 'bytes')
