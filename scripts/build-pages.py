"""Build the local-only GitHub Pages edition without changing the relay edition."""
from pathlib import Path
import shutil
root=Path(__file__).resolve().parent.parent
src=root/'dist'; out=root/'docs'
s=(src/'app.js').read_text()
def replace(old,new):
 global s
 if old not in s: raise RuntimeError('Source changed: '+old[:70])
 s=s.replace(old,new)
replace('function requireRelay(){',"function requireRelay(){throw Error('Online delivery is unavailable in this GitHub Pages edition. Use encrypted file exchange.');")
a=s.index('  function relayControls()'); b=s.index('\n',a)
s=s[:a]+'''  function relayControls(){return `<div class="card"><span class="section-label">GITHUB PAGES EDITION</span><h2>Share by encrypted file</h2><p>Notes, photos, vaults, backups, and encrypted file exchange work here. Online delivery is unavailable on this host. Export an encrypted message in Connections, then deliver the file yourself.</p><p class="small-text muted">This browser has its own space. Data from another site does not appear automatically; export an encrypted backup there and restore it here. Use one active tab per vault.</p>${state.relayPending?'<p class="notice">This backup contains an unconfirmed server message. Its outcome is unknown. Return to the original app to resolve it; this copy cannot check or retry it.</p>':''}</div>`;}
'''+s[b:]
replace("+btn('Check messages','relay-check','secondary small')",'')
replace('</option value="relay" ${!vault?\'disabled\':\'\'}>Queue an encrypted message on this server</option>','</option>')
replace('c.verified&&vault?', 'false?')
replace('if(c.blocked&&vault&&state.identity){','if(false){')
replace("c.blocked?'Unblock locally? This does not grant server permission.':'Block locally and try to revoke incoming server permission? Its unopened requests will be removed.'", "c.blocked?'Unblock this person locally?':'Block this person locally? Their unopened requests will be removed.'")
replace('Disable your server mailbox before erasing keys if you want its incoming queue removed. Local erasure does not delete the server mailbox, downloaded files, or other people’s copies.', 'Erasing this copy does not delete downloaded files, other people’s copies, or mailboxes previously created on another host.')
replace('Server delivery makes signed requests only when you choose a delivery action. The host receives connection metadata and may keep access logs. This private preview uses a host sign-in gate; the app itself has no account system.', 'This public GitHub Pages edition has no online delivery or app login. Your content stays in this browser unless you choose an export. GitHub receives connection metadata when serving the app. Downloaded files remain until you delete them.')
replace('File download stays on your device. Server delivery uploads only the encrypted envelope after your final action; the recipient must have enabled a mailbox and allowed your identity. Queued does not mean received or read. Cancelling after submission cannot recall a queued message.', 'Download stays on your device. Deliver the encrypted file yourself using a channel you choose. This edition does not upload or send the message.')
replace('<li>Optional server queues, per-sender permission, and manual message checks.</li>','<li>File exchange only on GitHub Pages; online queues are unavailable.</li>')
a=s.index('<p>The optional delivery backend');b=s.index('</p>',a)+4
s=s[:a]+'<p>This edition has no delivery backend and makes no API requests. Notes, photos, passphrases, and private keys stay in your browser. You choose when to export a file. GitHub serves the app and may record connection metadata. There are no analytics or remote fonts. This prototype has not had an independent security audit.</p>'+s[b:]
a=s.index('This hosted review copy is owner-private');b=s.index('</p>',a)
s=s[:a]+'This GitHub Pages copy is publicly accessible, but each browser has its own local space. Data is not shared between sites or devices automatically. To move your space, export an encrypted backup from the old copy and restore it here. Both people can exchange encrypted files using their own browsers.'+s[b:]
replace('The encrypted relay now supports manual delivery checks and per-sender permissions.', 'The repository also contains a separate relay-backed edition. This Pages edition supports encrypted file exchange only.')
(out/'app.js').write_text(s)
for name in ('index.html','styles.css','core.js','enselm-source.zip'):
 shutil.copy2(src/name,out/name)
p=out/'index.html';html=p.read_text().replace('<script defer src="relay.js?v=0.6.0"></script>','').replace("connect-src 'self'", "connect-src 'none'").replace('app.js?v=0.6.0','app.js?v=pages-1').replace('Prototype 0.6</span>','Prototype 0.6 · File exchange</span>');p.write_text(html)
shutil.copytree(src/'fonts',out/'fonts',dirs_exist_ok=True)
(out/'.nojekyll').touch()
print('Built functional Pages edition in docs/')
