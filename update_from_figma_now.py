#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Get fresh data from Figma and update HTML
"""
import json
import os
import sys
import urllib.request
import urllib.parse

# Paths
script_dir = os.path.dirname(os.path.abspath(__file__))
config_path = os.path.join(script_dir, "scripts", "figma-config.json")
data_path = os.path.join(script_dir, "figma-data.json")

print("=== Updating from Figma ===")
print()

# Load config
if not os.path.exists(config_path):
    print("Error: Config file not found")
    sys.exit(1)

with open(config_path, 'r', encoding='utf-8') as f:
    config = json.load(f)

file_key = config.get('fileKey')
token = config.get('token')
node_ids = config.get('nodeIds', ['67:5539'])

if not file_key or file_key == "YOUR_FIGMA_FILE_KEY":
    print("Error: Set FILE_KEY in scripts/figma-config.json")
    sys.exit(1)

if not token or token == "YOUR_FIGMA_TOKEN":
    print("Error: Set TOKEN in scripts/figma-config.json")
    sys.exit(1)

# Convert nodeIds for URL
node_ids_for_url = [nid.replace(':', '-') for nid in node_ids]
nodes_param = ','.join(node_ids_for_url)

# Get data from Figma
print("Step 1: Fetching data from Figma API...")
url = f"https://api.figma.com/v1/files/{file_key}/nodes?ids={nodes_param}"
req = urllib.request.Request(url)
req.add_header('X-Figma-Token', token)

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
    
    print("  Data received!")
    
    # Save data
    with open(data_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print("  Data saved to figma-data.json")
    print()
    
except Exception as e:
    print(f"Error fetching data: {e}")
    sys.exit(1)

# Find Main node
print("Step 2: Generating HTML from Main frame...")

def find_main_node(data):
    if 'nodes' in data:
        for node_key in data['nodes']:
            node = data['nodes'][node_key].get('document')
            if node and node.get('name') == 'Main' and node.get('type') == 'FRAME':
                return node
    return None

main_node = find_main_node(data)

if not main_node:
    print("Error: Main node not found in data")
    sys.exit(1)

print(f"  Found Main frame")
if 'absoluteBoundingBox' in main_node:
    w = main_node['absoluteBoundingBox']['width']
    h = main_node['absoluteBoundingBox']['height']
    print(f"  Size: {w}x{h}px")
if 'children' in main_node:
    print(f"  Elements: {len(main_node['children'])}")
print()

# Generate HTML
def rgb_to_hex(r, g, b):
    return f"#{int(r*255):02x}{int(g*255):02x}{int(b*255):02x}"

def generate_html_from_node(node, level=0):
    indent = "    " * level
    html = ""
    
    node_type = node.get('type', '')
    node_name = node.get('name', 'unnamed')
    class_name = ''.join(c if c.isalnum() else '-' for c in node_name).lower()
    
    if node_type in ['FRAME', 'GROUP']:
        style_attrs = []
        
        if 'absoluteBoundingBox' in node:
            w = node['absoluteBoundingBox']['width']
            h = node['absoluteBoundingBox']['height']
            style_attrs.append(f"width: {w}px")
            style_attrs.append(f"height: {h}px")
        
        # Layout mode
        if 'layoutMode' in node:
            if node['layoutMode'] == 'HORIZONTAL':
                style_attrs.append("display: flex")
                style_attrs.append("flex-direction: row")
            elif node['layoutMode'] == 'VERTICAL':
                style_attrs.append("display: flex")
                style_attrs.append("flex-direction: column")
        
        # Padding
        for prop in ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']:
            if prop in node:
                css_prop = prop[0].lower() + prop[1:].replace('Left', '-left').replace('Right', '-right').replace('Top', '-top').replace('Bottom', '-bottom')
                style_attrs.append(f"{css_prop}: {node[prop]}px")
        
        # Gap
        if 'itemSpacing' in node:
            style_attrs.append(f"gap: {node['itemSpacing']}px")
        
        # Align items
        if 'counterAxisAlignItems' in node and node['counterAxisAlignItems'] == 'CENTER':
            style_attrs.append("align-items: center")
        if 'primaryAxisAlignItems' in node and node['primaryAxisAlignItems'] == 'CENTER':
            style_attrs.append("justify-content: center")
        
        # Background color
        if 'backgroundColor' in node:
            c = node['backgroundColor']
            hex_color = rgb_to_hex(c['r'], c['g'], c['b'])
            style_attrs.append(f"background-color: {hex_color}")
        elif 'background' in node and len(node['background']) > 0:
            bg = node['background'][0]
            if bg.get('type') == 'SOLID':
                c = bg['color']
                hex_color = rgb_to_hex(c['r'], c['g'], c['b'])
                style_attrs.append(f"background-color: {hex_color}")
        
        style = f" style='{'; '.join(style_attrs)}'" if style_attrs else ""
        html += f"{indent}<div class='{class_name}'{style}>\n"
        
        if 'children' in node:
            for child in node['children']:
                html += generate_html_from_node(child, level + 1)
        
        html += f"{indent}</div>\n"
    
    elif node_type in ['RECTANGLE', 'ELLIPSE', 'VECTOR']:
        style_attrs = []
        
        if 'absoluteBoundingBox' in node:
            w = node['absoluteBoundingBox']['width']
            h = node['absoluteBoundingBox']['height']
            style_attrs.append(f"width: {w}px")
            style_attrs.append(f"height: {h}px")
        
        if 'fills' in node and len(node['fills']) > 0:
            fill = node['fills'][0]
            if fill.get('type') == 'SOLID':
                c = fill['color']
                hex_color = rgb_to_hex(c['r'], c['g'], c['b'])
                style_attrs.append(f"background-color: {hex_color}")
        
        style = f" style='{'; '.join(style_attrs)}'" if style_attrs else ""
        html += f"{indent}<div class='{class_name}'{style}></div>\n"
    
    elif node_type == 'TEXT':
        text = node.get('characters', '')
        style_attrs = []
        
        if 'absoluteBoundingBox' in node:
            w = node['absoluteBoundingBox']['width']
            h = node['absoluteBoundingBox']['height']
            style_attrs.append(f"width: {w}px")
            style_attrs.append(f"height: {h}px")
        
        if 'style' in node:
            style_obj = node['style']
            if 'fontSize' in style_obj:
                style_attrs.append(f"font-size: {style_obj['fontSize']}px")
            if 'fontFamily' in style_obj:
                style_attrs.append(f"font-family: {style_obj['fontFamily']}, sans-serif")
            if 'fontWeight' in style_obj:
                style_attrs.append(f"font-weight: {style_obj['fontWeight']}")
            if 'lineHeightPx' in style_obj:
                style_attrs.append(f"line-height: {style_obj['lineHeightPx']}px")
            if 'letterSpacing' in style_obj:
                style_attrs.append(f"letter-spacing: {style_obj['letterSpacing']}px")
            if 'textAlignHorizontal' in style_obj:
                style_attrs.append(f"text-align: {style_obj['textAlignHorizontal'].lower()}")
        
        if 'fills' in node and len(node['fills']) > 0:
            fill = node['fills'][0]
            if fill.get('type') == 'SOLID':
                c = fill['color']
                hex_color = rgb_to_hex(c['r'], c['g'], c['b'])
                style_attrs.append(f"color: {hex_color}")
        
        style = f" style='{'; '.join(style_attrs)}'" if style_attrs else ""
        html += f"{indent}<p class='{class_name}'{style}>{text}</p>\n"
    
    elif node_type in ['COMPONENT', 'INSTANCE']:
        html += f"{indent}<div class='{class_name} component'>\n"
        if 'children' in node:
            for child in node['children']:
                html += generate_html_from_node(child, level + 1)
        html += f"{indent}</div>\n"
    
    return html

html_content = generate_html_from_node(main_node)

# Create full HTML
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
html_path = os.path.join(script_dir, "index.html")
with open(html_path, 'w', encoding='utf-8') as f:
    f.write(full_html)

print("  HTML updated: index.html")
print()
print("=== Done! Page updated ===")

