// Generates tests/sample-2p.pdf (2 pages, plain text) with no dependencies.
const fs = require("fs"), path = require("path");
const objs = [];
const add = (s) => { objs.push(s); return objs.length; };
add("<< /Type /Catalog /Pages 2 0 R >>");
add("<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>");
const stream = (txt) => { const s = `BT /F1 36 Tf 60 400 Td (${txt}) Tj ET 0.2 w 60 80 480 300 re S`; return `<< /Length ${s.length} >>\nstream\n${s}\nendstream`; };
add("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R >>");
add(stream("Plan RDC 1:100"));
add("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>");
add(stream("Coupe AA"));
add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
let out = "%PDF-1.4\n"; const off = [];
objs.forEach((o, i) => { off.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
const x = out.length;
out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + off.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("");
out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
fs.writeFileSync(path.join(__dirname, "sample-2p.pdf"), out, "latin1");
