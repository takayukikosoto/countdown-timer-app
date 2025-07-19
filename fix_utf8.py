#!/usr/bin/env python3
import os
import sys
import argparse

def scan_file(file_path):
    """Scan a file for invalid UTF-8 sequences"""
    try:
        with open(file_path, 'rb') as f:
            content = f.read()
            
        # Try to decode as UTF-8 and catch errors
        try:
            content.decode('utf-8')
            return None  # No issues found
        except UnicodeDecodeError as e:
            # Found invalid UTF-8
            start = max(0, e.start - 20)
            end = min(len(content), e.end + 20)
            
            # Extract the problematic bytes and nearby context
            context = content[start:end]
            
            # Create hex representation
            hex_repr = ' '.join(f'{b:02x}' for b in context)
            
            return {
                'error': str(e),
                'position': e.start,
                'hex_context': hex_repr
            }
    except Exception as e:
        return {'error': f'Failed to process file: {str(e)}'}

def fix_file(file_path):
    """Attempt to fix a file with UTF-8 issues by forcing encoding"""
    try:
        with open(file_path, 'rb') as f:
            content = f.read()
        
        # Try to decode with 'replace' option to substitute invalid chars
        fixed_content = content.decode('utf-8', errors='replace')
        
        # Create backup
        backup_path = file_path + '.bak'
        with open(backup_path, 'wb') as f:
            f.write(content)
        
        # Write fixed content
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
            
        return {'status': 'fixed', 'backup': backup_path}
    except Exception as e:
        return {'status': 'error', 'error': str(e)}

def scan_directory(directory, extensions, fix=False):
    """Scan a directory recursively for files with invalid UTF-8"""
    results = {'issues_found': 0, 'files_scanned': 0, 'files_fixed': 0, 'problems': []}
    
    for root, dirs, files in os.walk(directory):
        # Skip node_modules and .git directories
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if '.git' in dirs:
            dirs.remove('.git')
        
        for file in files:
            # Skip files without specified extensions
            if extensions and not any(file.endswith(ext) for ext in extensions):
                continue
                
            file_path = os.path.join(root, file)
            results['files_scanned'] += 1
            
            # Skip large files
            try:
                if os.path.getsize(file_path) > 1024 * 1024 * 5:  # 5MB
                    continue
            except:
                continue
                
            issue = scan_file(file_path)
            if issue:
                results['issues_found'] += 1
                problem = {'file': file_path, 'issue': issue}
                
                if fix:
                    fix_result = fix_file(file_path)
                    problem['fix_result'] = fix_result
                    if fix_result.get('status') == 'fixed':
                        results['files_fixed'] += 1
                        
                results['problems'].append(problem)
                
                # Print immediate feedback
                print(f"Issue found in {file_path}: {issue.get('error')}")
                if fix:
                    print(f"  Fix attempt: {fix_result.get('status')}")
    
    return results

def main():
    parser = argparse.ArgumentParser(description='Scan for invalid UTF-8 characters in files')
    parser.add_argument('-d', '--directory', default='.', help='Directory to scan')
    parser.add_argument('-e', '--extensions', help='File extensions to check (comma separated)')
    parser.add_argument('-f', '--fix', action='store_true', help='Attempt to fix issues')
    args = parser.parse_args()
    
    extensions = args.extensions.split(',') if args.extensions else []
    
    print(f"Scanning directory: {args.directory}")
    print(f"File extensions: {extensions or 'all'}")
    print(f"Fix mode: {'enabled' if args.fix else 'disabled'}")
    print("---")
    
    results = scan_directory(args.directory, extensions, args.fix)
    
    print("---")
    print(f"Scan complete. Scanned {results['files_scanned']} files.")
    print(f"Found {results['issues_found']} files with UTF-8 issues.")
    
    if args.fix:
        print(f"Fixed {results['files_fixed']} files.")
    
    if results['issues_found'] > 0:
        print("\nProblematic files:")
        for problem in results['problems']:
            print(f"- {problem['file']}")
            print(f"  Error: {problem['issue'].get('error')}")
            print(f"  Hex context: {problem['issue'].get('hex_context')}")
            if args.fix:
                print(f"  Fix status: {problem['fix_result'].get('status')}")
                if problem['fix_result'].get('status') == 'fixed':
                    print(f"  Backup: {problem['fix_result'].get('backup')}")
            print("")

if __name__ == "__main__":
    main()
