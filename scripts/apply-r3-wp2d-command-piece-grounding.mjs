import fs from 'node:fs';

const file = 'src/r3-terrain-prototype.css';
let source = fs.readFileSync(file, 'utf8');

const replace = (before, after, label) => {
  if (!source.includes(before)) throw new Error(`WP2D command-piece anchor missing: ${label}`);
  source = source.replace(before, after);
};

replace(
`  background: rgba(6, 48, 50, .96);
  color: #edfffb;
  box-shadow: 0 4px 12px rgba(0, 0, 0, .55), inset 0 0 0 1px rgba(255, 255, 255, .06);`,
`  background: linear-gradient(180deg, rgba(13, 65, 66, .98), rgba(5, 39, 42, .98));
  color: #edfffb;
  box-shadow: 0 5px 0 -3px rgba(0, 0, 0, .72), 0 9px 16px rgba(0, 0, 0, .5), inset 0 1px 0 rgba(255, 255, 255, .11), inset 0 -2px 0 rgba(0, 0, 0, .2);`,
'friendly formation grounding');

replace(
`  border-color: #f4ffff;
  box-shadow: 0 0 0 3px rgba(102, 245, 226, .35), 0 4px 14px rgba(0, 0, 0, .6);`,
`  border-color: #f4ffff;
  box-shadow: 0 0 0 3px rgba(102, 245, 226, .35), 0 5px 0 -3px rgba(0, 0, 0, .74), 0 10px 18px rgba(0, 0, 0, .56), inset 0 1px 0 rgba(255, 255, 255, .14);`,
'selected formation grounding');

replace(
`  background: rgba(83, 28, 29, .94);
  color: #fff5ef;
  box-shadow: 0 4px 12px rgba(0, 0, 0, .55);`,
`  background: linear-gradient(180deg, rgba(105, 39, 39, .96), rgba(67, 21, 24, .97));
  color: #fff5ef;
  box-shadow: 0 5px 0 -3px rgba(0, 0, 0, .7), 0 9px 15px rgba(0, 0, 0, .5), inset 0 1px 0 rgba(255, 255, 255, .09);`,
'enemy contact grounding');

replace(
`  background: rgba(79, 35, 22, .96);
  color: #fff0cb;
  box-shadow: 0 0 0 2px rgba(255, 122, 86, .16), 0 4px 12px rgba(0, 0, 0, .55);`,
`  background: radial-gradient(circle at 38% 30%, rgba(116, 58, 32, .98), rgba(66, 27, 20, .98));
  color: #fff0cb;
  box-shadow: 0 0 0 2px rgba(255, 122, 86, .16), 0 5px 0 -3px rgba(0, 0, 0, .68), 0 9px 15px rgba(0, 0, 0, .5), inset 0 1px 0 rgba(255, 255, 255, .08);`,
'live threat grounding');

replace(
`  background: rgba(64, 37, 18, .95);
  color: #ffe4ad;
  box-shadow: 0 3px 10px rgba(0, 0, 0, .5);`,
`  background: linear-gradient(180deg, rgba(86, 51, 25, .97), rgba(52, 29, 15, .98));
  color: #ffe4ad;
  box-shadow: 0 4px 0 -2px rgba(0, 0, 0, .68), 0 8px 14px rgba(0, 0, 0, .46), inset 0 1px 0 rgba(255, 255, 255, .08);`,
'operation grounding');

fs.writeFileSync(file, source);
console.log('Applied R3-WP2D command-piece grounding refinement.');
