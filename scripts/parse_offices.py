#!/usr/bin/env python3
import re, json, os

md_path = os.path.join(os.path.dirname(__file__), '..', 'offices.md')
out_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'officesData.ts')

os.makedirs(os.path.dirname(out_path), exist_ok=True)

with open(md_path, encoding='utf-8') as f:
    content = f.read()

# Split on ## headings
sections = re.split(r'\n## ', content)
offices = []

for section in sections[1:]:  # skip preamble
    lines = section.strip().split('\n')
    header = lines[0].strip()  # e.g. "01A - Adrar"
    
    # Parse code and name
    m = re.match(r'(\w+)\s*-\s*(.+)', header)
    if not m:
        continue
    code = m.group(1).strip()
    name = m.group(2).strip()
    
    # Extract wilaya (first word(s) before a space or sub-city indicator)
    wilaya = name.split(' ')[0]
    # For multi-word wilayas, use full name up to known sub-city patterns
    # Heuristic: if code letter suffix > A, it's a sub-office of same wilaya
    
    address = ''
    maps_url = ''
    phone = ''
    
    for line in lines[1:]:
        line = line.strip().lstrip('- ')
        if line.startswith('**Adresse:**'):
            address = line.replace('**Adresse:**', '').strip()
        elif line.startswith('**Maps:**'):
            # Match first URL inside markdown link: [label](url) -> capture group 1
            m2 = re.search(r'\(https?://([^\)]+)\)', line)
            if m2:
                maps_url = 'https://' + m2.group(1)
            else:
                m2 = re.search(r'https?://\S+', line)
                if m2:
                    maps_url = m2.group(0)
        elif line.startswith('**Tel:**'):
            phone = line.replace('**Tel:**', '').strip()
    
    offices.append({
        'code': code,
        'name': name,
        'address': address,
        'phone': phone,
        'mapsUrl': maps_url,
    })

# Build wilaya grouping: use numeric prefix to group
# e.g. 01A, 01B -> wilaya "Adrar" (wilaya 01)
# We'll map the code prefix to wilaya name from the first entry per prefix
wilaya_map = {}
for o in offices:
    prefix = re.match(r'(\d+)', o['code'])
    if prefix:
        num = prefix.group(1).lstrip('0') or '0'
        if num not in wilaya_map:
            # Derive wilaya from name - take part before any known sub-city keyword
            wilaya_map[num] = o['name']

# Now determine the wilaya for each office
WILAYA_NAMES = {
    '1':'Adrar','2':'Chlef','3':'Laghouat','4':'Oum El Bouaghi','5':'Batna',
    '6':'Béjaïa','7':'Biskra','8':'Béchar','9':'Blida','10':'Bouira',
    '11':'Tamanrasset','12':'Tébessa','13':'Tlemcen','14':'Tiaret','15':'Tizi Ouzou',
    '16':'Alger','17':'Djelfa','18':'Jijel','19':'Sétif','20':'Saïda',
    '21':'Skikda','22':'Sidi Bel Abbès','23':'Annaba','24':'Guelma','25':'Constantine',
    '26':'Médéa','27':'Mostaganem','28':"M'Sila",'29':'Mascara','30':'Ouargla',
    '31':'Oran','32':'El Bayadh','33':'Illizi','34':'Bordj Bou Arréridj','35':'Boumerdès',
    '36':'El Tarf','37':'Tindouf','38':'Tissemsilt','39':'El Oued','40':'Khenchela',
    '41':'Souk Ahras','42':'Tipaza','43':'Mila','44':'Aïn Defla','45':'Naâma',
    '46':'Aïn Témouchent','47':'Ghardaïa','48':'Relizane','49':'Timimoun','51':'Ouled Djellal',
    '52':'Béni Abbès','53':'In Salah','55':'Touggourt','56':'Djanet','58':'El Meniaa',
}

lines_out = []
lines_out.append("import { DeskStation, DeskItem } from '../types';\n")
lines_out.append("\nconst OFFICES_RAW: (Omit<DeskStation,'id'> & { wilaya: string })[] = [")

for o in offices:
    prefix = re.match(r'(\d+)', o['code'])
    num = prefix.group(1).lstrip('0') or '0' if prefix else '0'
    wilaya = WILAYA_NAMES.get(num, o['name'])
    
    addr = o['address'].replace('\\', '\\\\').replace('"', '\\"')
    ph   = o['phone'].replace('"', '\\"')
    maps = o['mapsUrl'].replace('"', '\\"')
    nm   = o['name'].replace('"', '\\"')
    wil  = wilaya.replace('"', '\\"')
    
    lines_out.append(
        f'  {{ wilaya: "{wil}", name: "{nm}", address: "{addr}", phone: "{ph}", mapsUrl: "{maps}" }},'
    )

lines_out.append("];\n")
lines_out.append("""
const wilayaMap = new Map<string, DeskStation[]>();
OFFICES_RAW.forEach(d => {
  if (!wilayaMap.has(d.wilaya)) wilayaMap.set(d.wilaya, []);
  wilayaMap.get(d.wilaya)!.push({ wilaya: d.wilaya, name: d.name, address: d.address, phone: d.phone, mapsUrl: d.mapsUrl });
});

const organized: DeskItem[] = [];
wilayaMap.forEach((stations, wilaya) => organized.push({ wilaya, stations }));
organized.sort((a, b) => a.wilaya.localeCompare(b.wilaya, 'fr'));

export const DESK_DATA: DeskItem[] = organized;
""")

with open(out_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines_out))

print(f"Written {len(offices)} offices to {out_path}")
