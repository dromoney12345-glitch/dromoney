const fs = require('fs');

try {
  const content = fs.readFileSync('C:/Users/trish/.gemini/antigravity-ide/brain/087c2c98-a545-4a75-939b-b5f252c980c1/.system_generated/steps/776/content.md', 'utf8');
  // the content is markdown with Title, etc at top. The JSON starts with '{"info":'
  const jsonStart = content.indexOf('{"info":');
  const jsonContent = content.substring(jsonStart);
  const data = JSON.parse(jsonContent);

  let output = '';
  data.item.forEach(group => {
    if(group.item) {
      group.item.forEach(api => {
        if (!api.request) return;
        const url = api.request.url?.raw || (api.request.url?.host ? api.request.url.host.join('.') + '/' + api.request.url.path.join('/') : '');
        output += `[${api.name}] ${api.request.method} ${url}\n`;
        if(api.request.body && api.request.body.raw) output += `Payload: ${api.request.body.raw}\n`;
        output += '\n';
      });
    } else {
        if (!group.request) return;
        const url = group.request.url?.raw || (group.request.url?.host ? group.request.url.host.join('.') + '/' + group.request.url.path.join('/') : '');
        output += `[${group.name}] ${group.request.method} ${url}\n\n`;
    }
  });

  fs.writeFileSync('zuelpay_summary.txt', output);
  console.log("Summary saved to zuelpay_summary.txt");
} catch(e) {
  console.error(e);
}
