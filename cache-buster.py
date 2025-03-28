import os
import hashlib
from bs4 import BeautifulSoup

def compute_hash(file_path):
    """Compute an 8-character SHA256 hash of the file content."""
    with open(file_path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()[:8]

def extract_original_name_and_hash(file_path):
    """Extract the base name, hash (if present), and extension from a filename."""
    dir_name = os.path.dirname(file_path)
    base_name = os.path.basename(file_path)
    parts = base_name.rsplit('.', 2)
    if len(parts) == 3 and len(parts[1]) == 8 and parts[1].isalnum():
        base = parts[0]
        hash_part = parts[1]
        ext = parts[2]
    else:
        base = '.'.join(parts[:-1]) if len(parts) > 1 else parts[0]
        hash_part = None
        ext = parts[-1] if len(parts) > 1 else ''
    return dir_name, base, hash_part, ext

def main():
    # Path to index.html (adjust if not in the repository root)
    index_path = 'index.html'
    
    # Parse index.html
    with open(index_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')

    # Collect local script and link tags
    tags = []
    for script in soup.find_all('script', src=True):
        if not script['src'].startswith(('http://', 'https://')):
            tags.append((script, 'src'))
    for link in soup.find_all('link', rel='stylesheet', href=True):
        if not link['href'].startswith(('http://', 'https://')):
            tags.append((link, 'href'))

    # Process each local file reference
    for tag, attr in tags:
        current_src = tag[attr]
        file_path = os.path.normpath(os.path.join(os.path.dirname(index_path), current_src))
        
        # Skip if the file doesn't exist
        if not os.path.exists(file_path):
            print(f"Warning: File {file_path} does not exist.")
            continue
        
        # Compute the new hash based on current content
        new_hash = compute_hash(file_path)
        
        # Extract components of the current filename
        dir_name, base, _, ext = extract_original_name_and_hash(file_path)
        
        # Generate the new filename with the hash
        new_base_name = f"{base}.{new_hash}{ext}"
        new_file_path = os.path.join(dir_name, new_base_name)
        
        # Rename the file and update the HTML if the filename has changed
        if new_file_path != file_path:
            os.rename(file_path, new_file_path)
            new_src = os.path.relpath(new_file_path, os.path.dirname(index_path))
            tag[attr] = new_src

    # Save the updated HTML
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(str(soup))

if __name__ == '__main__':
    main()
