#!/usr/bin/env python3
"""
Convert Markdown files to PDF
"""

import os
import markdown
from weasyprint import HTML, CSS
from pathlib import Path

# Files to convert
files_to_convert = [
    "DFD_DATA_FLOW_DIAGRAMS.md",
    "ARCHITECTURE_SYSTEM_DESIGN.md",
    "QUICK_REFERENCE_ARCHITECTRURE.md",
]

# CSS for styling
css_string = """
@page {
    size: A4;
    margin: 2cm;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #333;
}

h1 {
    font-size: 24pt;
    color: #1976d2;
    margin-top: 0;
    margin-bottom: 15pt;
    border-bottom: 3px solid #1976d2;
    padding-bottom: 10pt;
}

h2 {
    font-size: 18pt;
    color: #1976d2;
    margin-top: 20pt;
    margin-bottom: 10pt;
}

h3 {
    font-size: 14pt;
    color: #424242;
    margin-top: 15pt;
    margin-bottom: 8pt;
}

h4, h5 {
    font-size: 12pt;
    color: #555;
}

code {
    background-color: #f5f5f5;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 10pt;
}

pre {
    background-color: #f5f5f5;
    padding: 12pt;
    border-radius: 5px;
    overflow-x: auto;
    border-left: 3px solid #1976d2;
    margin: 12pt 0;
}

pre code {
    background-color: transparent;
    padding: 0;
    font-size: 9pt;
}

blockquote {
    border-left: 3px solid #1976d2;
    margin-left: 0;
    padding-left: 15pt;
    color: #666;
    font-style: italic;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin: 12pt 0;
}

th {
    background-color: #1976d2;
    color: white;
    padding: 8pt;
    text-align: left;
    font-weight: bold;
}

td {
    border: 1px solid #ddd;
    padding: 8pt;
}

tr:nth-child(even) {
    background-color: #f9f9f9;
}

ul, ol {
    margin: 10pt 0;
    padding-left: 30pt;
}

li {
    margin: 5pt 0;
}

a {
    color: #1976d2;
    text-decoration: none;
}

a:hover {
    text-decoration: underline;
}

.page-break {
    page-break-after: always;
}

strong {
    font-weight: bold;
    color: #333;
}

em {
    font-style: italic;
}

hr {
    border: none;
    border-top: 2px solid #1976d2;
    margin: 20pt 0;
}
"""

def convert_md_to_pdf(md_file):
    """Convert markdown file to PDF"""
    
    # Read markdown file
    with open(md_file, 'r', encoding='utf-8') as f:
        md_content = f.read()
    
    # Convert markdown to HTML
    html_content = markdown.markdown(
        md_content,
        extensions=['extra', 'tables', 'codehilite', 'toc']
    )
    
    # Add HTML wrapper
    full_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>{os.path.basename(md_file)}</title>
        <style>
            {css_string}
        </style>
    </head>
    <body>
        {html_content}
    </body>
    </html>
    """
    
    # Generate PDF filename
    pdf_file = md_file.replace('.md', '.pdf')
    
    try:
        # Convert HTML to PDF
        HTML(string=full_html).write_pdf(pdf_file)
        print(f"✅ Created: {pdf_file}")
        return True
    except Exception as e:
        print(f"❌ Error creating {pdf_file}: {str(e)}")
        return False

# Main conversion
print("🔄 Converting Markdown files to PDF...\n")

success_count = 0
for md_file in files_to_convert:
    if os.path.exists(md_file):
        if convert_md_to_pdf(md_file):
            success_count += 1
    else:
        print(f"⚠️ File not found: {md_file}")

print(f"\n✅ Conversion complete! {success_count}/{len(files_to_convert)} files converted.")
print("\n📄 Generated PDF files:")
for md_file in files_to_convert:
    pdf_file = md_file.replace('.md', '.pdf')
    if os.path.exists(pdf_file):
        size = os.path.getsize(pdf_file) / 1024  # Size in KB
        print(f"   • {pdf_file} ({size:.1f} KB)")
