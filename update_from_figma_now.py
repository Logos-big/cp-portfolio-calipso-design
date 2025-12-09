#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Quick update script to fetch fresh data from Figma and update HTML
"""

import json
import urllib.request
import urllib.parse
import os
import sys

# Read config
config_path = "scripts/figma-config.json"
if not os.path.exists(config_path):
    print(f"Error: Config file not found at {config_path}")
    sys.exit(1)

with open(config_path, 'r', encoding='utf-8') as f:
    config = json.load(f)

file_key = config.get('fileKey')
token = config.get('token')
node_ids = config.get('nodeIds', [])

if not file_key or not token:
    print("Error: Missing fileKey or token in config")
    sys.exit(1)

# Build API URL
if node_ids:
    node_ids_str = ','.join(node_ids)
    url = f"https://api.figma.com/v1/files/{file_key}/nodes?ids={node_ids_str}"
else:
    url = f"https://api.figma.com/v1/files/{file_key}"

# Make request
headers = {
    'X-Figma-Token': token
}

print("Connecting to Figma API...")
try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        print("Data received!")
        
        # Save data
        with open('figma-data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print("Data saved to figma-data.json")
        
except urllib.error.HTTPError as e:
    if e.code == 429:
        print("Warning: Rate limit exceeded (429)")
        print("Using cached data from figma-data.json")
        if not os.path.exists('figma-data.json'):
            print("Error: No cached data available")
            sys.exit(1)
    else:
        print(f"Error: {e.code} - {e.reason}")
        sys.exit(1)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)

# Load data
with open('figma-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Find Main node
def find_main_node(data):
    if 'nodes' in data:
        for node_key in data['nodes']:
            node = data['nodes'][node_key].get('document', {})
            if node.get('name') == 'Main' and node.get('type') == 'FRAME':
                return node
    return None

main_node = find_main_node(data)

if not main_node:
    print("Error: Main node not found")
    sys.exit(1)

print(f"Found Main frame: {main_node.get('absoluteBoundingBox', {}).get('width', 0)}x{main_node.get('absoluteBoundingBox', {}).get('height', 0)}px")

# Generate HTML
def rgb_to_hex(r, g, b):
    return f"#{int(r*255):02x}{int(g*255):02x}{int(b*255):02x}"

def generate_html(node, level=0):
    indent = "    " * level
    html = ""
    
    if node.get('type') in ['FRAME', 'GROUP']:
        class_name = node.get('name', '').lower().replace(' ', '-').replace('_', '-')
        style_parts = []
        
        bbox = node.get('absoluteBoundingBox', {})
        if bbox:
            style_parts.append(f"width: {bbox.get('width', 0)}.0px")
            style_parts.append(f"height: {bbox.get('height', 0)}.0px")
        
        layout_mode = node.get('layoutMode')
        if layout_mode == 'HORIZONTAL':
            style_parts.append("display: flex")
            style_parts.append("flex-direction: row")
        elif layout_mode == 'VERTICAL':
            style_parts.append("display: flex")
            style_parts.append("flex-direction: column")
        
        if node.get('paddingLeft'):
            style_parts.append(f"padding-left: {node.get('paddingLeft')}.0px")
        if node.get('paddingRight'):
            style_parts.append(f"padding-right: {node.get('paddingRight')}.0px")
        if node.get('paddingTop'):
            style_parts.append(f"padding-top: {node.get('paddingTop')}.0px")
        if node.get('paddingBottom'):
            style_parts.append(f"padding-bottom: {node.get('paddingBottom')}.0px")
        
        if node.get('itemSpacing'):
            style_parts.append(f"gap: {node.get('itemSpacing')}.0px")
        
        if node.get('counterAxisAlignItems') == 'CENTER':
            style_parts.append("align-items: center")
        if node.get('primaryAxisAlignItems') == 'CENTER':
            style_parts.append("justify-content: center")
        
        bg_color = node.get('backgroundColor')
        if bg_color:
            hex_color = rgb_to_hex(bg_color.get('r', 0), bg_color.get('g', 0), bg_color.get('b', 0))
            style_parts.append(f"background-color: {hex_color}")
        elif node.get('background') and len(node.get('background', [])) > 0:
            bg = node['background'][0]
            if bg.get('type') == 'SOLID':
                c = bg.get('color', {})
                hex_color = rgb_to_hex(c.get('r', 0), c.get('g', 0), c.get('b', 0))
                style_parts.append(f"background-color: {hex_color}")
        
        style_attr = f" style='{'; '.join(style_parts)}'" if style_parts else ""
        html += f"{indent}<div class='{class_name}'{style_attr}>\n"
        
        for child in node.get('children', []):
            html += generate_html(child, level + 1)
        
        html += f"{indent}</div>\n"
    
    elif node.get('type') == 'TEXT':
        class_name = node.get('name', '').lower().replace(' ', '-').replace('_', '-')
        text = node.get('characters', '')
        style_parts = []
        
        bbox = node.get('absoluteBoundingBox', {})
        if bbox:
            style_parts.append(f"width: {bbox.get('width', 0)}.0px")
            style_parts.append(f"height: {bbox.get('height', 0)}.0px")
        
        style = node.get('style', {})
        if style:
            style_parts.append(f"font-size: {style.get('fontSize', 16)}.0px")
            style_parts.append(f"font-family: {style.get('fontFamily', 'sans-serif')}, sans-serif")
            style_parts.append(f"font-weight: {style.get('fontWeight', 400)}")
            style_parts.append(f"line-height: {style.get('lineHeightPx', 16)}.0px")
            style_parts.append(f"letter-spacing: {style.get('letterSpacing', 0)}.0px")
            
            text_align = style.get('textAlignHorizontal', 'LEFT').lower()
            style_parts.append(f"text-align: {text_align}")
        
        fills = node.get('fills', [])
        if fills and len(fills) > 0 and fills[0].get('type') == 'SOLID':
            c = fills[0].get('color', {})
            hex_color = rgb_to_hex(c.get('r', 0), c.get('g', 0), c.get('b', 0))
            style_parts.append(f"color: {hex_color}")
        
        style_attr = f" style='{'; '.join(style_parts)}'" if style_parts else ""
        html += f"{indent}<p class='{class_name}'{style_attr}>{text}</p>\n"
    
    return html

html_content = generate_html(main_node)

# Generate full HTML
full_html = f"""<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calipso Design</title>
    <link rel="stylesheet" href="styles/figma-variables.css">
    <link rel="stylesheet" href="styles/main.css">
</head>
<body>
{html_content}
</body>
</html>"""

# Save HTML
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(full_html)

print("HTML generated and saved to index.html")
print("Done!")
