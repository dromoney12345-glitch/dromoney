const fs = require('fs');
try {
  const content = fs.readFileSync('C:/Users/trish/.gemini/antigravity-ide/brain/087c2c98-a545-4a75-939b-b5f252c980c1/.system_generated/steps/776/content.md', 'utf8');
  const jsonStart = content.indexOf('{"info":');
  const data = JSON.parse(content.substring(jsonStart));
  let found = [];
  function search(items) {
    items.forEach(i => {
      if(i.name && i.name.toLowerCase().includes('order')) found.push(i);
      if(i.item) search(i.item);
    });
  }
  search(data.item);
  fs.writeFileSync('debug.txt', JSON.stringify(found, null, 2));
} catch (e) {
  fs.writeFileSync('debug.txt', e.toString());
}
