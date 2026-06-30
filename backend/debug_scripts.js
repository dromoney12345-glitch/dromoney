const fs = require('fs');
try {
  const content = fs.readFileSync('C:/Users/trish/.gemini/antigravity-ide/brain/087c2c98-a545-4a75-939b-b5f252c980c1/.system_generated/steps/776/content.md', 'utf8');
  const jsonStart = content.indexOf('{"info":');
  const data = JSON.parse(content.substring(jsonStart));
  let scripts = [];
  function extract(items) {
    items.forEach(i => {
      if(i.event) {
        i.event.forEach(e => {
          if(e.script && e.script.exec) scripts.push(i.name + ':\n' + e.script.exec.join('\n'));
        });
      }
      if(i.item) extract(i.item);
    });
  }
  if(data.event) {
      data.event.forEach(e => {
          if(e.script && e.script.exec) scripts.push('Collection Level:\n' + e.script.exec.join('\n'));
      });
  }
  extract(data.item);
  fs.writeFileSync('debug_scripts.txt', scripts.join('\n\n'));
} catch (e) {
  fs.writeFileSync('debug_scripts.txt', e.toString());
}
