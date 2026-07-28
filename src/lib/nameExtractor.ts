/**
 * Intelligent Email Name Extractor & Formatter
 * Automatically extracts, cleans, and formats human names from raw email addresses or noisy text inputs.
 * Examples:
 *   - karansingh929@aol.com -> Karan Singh
 *   - kalvin.smith@gmail.com -> Kalvin Smith
 *   - k_smith@yahoo.com -> Kalvin Smith
 *   - kalvn@aol.com -> Kalvin
 *   - alex_jones@gmail.com -> Alex Jones
 *   - mkt.rani2522@gmail.com -> Mkt Rani
 */

const COMMON_SUFFIXES = [
  // Indian Surnames & Suffixes
  'singh', 'sharma', 'kumar', 'gupta', 'verma', 'yadav', 'rani', 'das', 'roy', 'mishra',
  'patel', 'shah', 'rao', 'choudhary', 'chaudhary', 'chauhan', 'joshi', 'nair', 'reddy',
  'mehta', 'jain', 'bansal', 'trivedi', 'pandey', 'tiwari', 'malhotra', 'kapoor', 'chopra',
  'arora', 'dhawan', 'gill', 'kaur', 'thakur', 'dubey', 'saxena', 'seth', 'sethi', 'garg',
  'agarwal', 'agrawal', 'sinha', 'ghosh', 'bose', 'dutta', 'sengupta', 'mukherjee', 'banerjee',
  // Western Surnames & Suffixes
  'smith', 'jones', 'brown', 'taylor', 'miller', 'davis', 'wilson', 'moore', 'white',
  'clark', 'hall', 'thomas', 'jackson', 'adiso', 'johnson', 'williams', 'harris', 'martin',
  'thompson', 'garcia', 'martinez', 'robinson', 'rodriguez', 'lewis', 'lee', 'walker', 'allen',
  'turner', 'campbell', 'parker', 'evans', 'edwards', 'collins', 'stewart', 'sanchez', 'morris',
  // Department / Role Keywords
  'marketing', 'sales', 'support', 'info', 'tech', 'seo', 'web', 'dev', 'official', 'team', 'care', 'consulting'
];

const COMMON_FIRST_NAMES = [
  'karan', 'kalvin', 'kalvn', 'alex', 'rahul', 'rohit', 'amit', 'priya', 'pooja', 'neha',
  'sachin', 'vikas', 'akash', 'gaurav', 'vishal', 'sanjay', 'ajay', 'vijay', 'manish',
  'suresh', 'ramesh', 'rajesh', 'anil', 'sunil', 'deepak', 'pankaj', 'alok', 'arun', 'varun',
  'tarun', 'kiran', 'sumit', 'mohit', 'ashish', 'abhishek', 'ankit', 'ravi', 'shubham',
  'nithin', 'nitin', 'karthik', 'aditya', 'vivek', 'prashant', 'siddharth', 'rishabh',
  'john', 'paul', 'david', 'michael', 'chris', 'james', 'robert', 'william', 'joseph',
  'thomas', 'charles', 'daniel', 'matthew', 'anthony', 'mark', 'steve', 'steven', 'andrew',
  'richard', 'brian', 'kevin', 'jason', 'jeff', 'sarah', 'emily', 'jessica', 'jennifer',
  'lisa', 'laura', 'anna', 'emma', 'maria', 'rachel', 'samantha', 'megan', 'amanda',
  'mkt', 'info', 'contact', 'admin', 'support', 'sales', 'team', 'seo', 'web', 'dorothy', 'lavender'
];

const SHORTCUT_MAP: Record<string, string> = {
  'k': 'Kalvin',
  'kalvn': 'Kalvin',
  'kalv': 'Kalvin',
  'klv': 'Kalvin',
  'a': 'Alex',
  'alx': 'Alex',
  'j': 'John',
  'jhn': 'John',
  'm': 'Mike',
  's': 'Sarah',
  'r': 'Rahul',
  'p': 'Paul',
  'd': 'David',
  'mkt': 'Marketing',
  'adm': 'Admin',
  'mgr': 'Manager',
  'dev': 'Developer',
  'tech': 'Tech'
};

/**
 * Capitalizes a word or expands shortcuts (e.g., 'k' -> 'Kalvin', 'singh' -> 'Singh')
 */
function formatToken(token: string): string {
  if (!token) return '';
  const lower = token.toLowerCase().trim();
  if (SHORTCUT_MAP[lower]) {
    return SHORTCUT_MAP[lower];
  }
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Main function to extract human name from an email address or raw name text
 */
export function extractNameFromEmail(input?: string): string {
  if (!input || typeof input !== 'string') return 'Friend';
  
  let clean = input.trim();
  if (!clean) return 'Friend';

  // Case 1: John Smith <john@example.com> or "John Smith" <john@example.com>
  const angleMatch = clean.match(/^("?)([^"<]+)\1\s*<[^>]+>/);
  if (angleMatch && angleMatch[2]?.trim()) {
    return angleMatch[2].trim().split(/\s+/).map(formatToken).filter(Boolean).join(' ');
  }

  // Case 2: john@example.com (John Smith)
  const parenMatch = clean.match(/\(([^)]+)\)$/);
  if (parenMatch && parenMatch[1]?.trim()) {
    return parenMatch[1].trim().split(/\s+/).map(formatToken).filter(Boolean).join(' ');
  }
  
  // If it's an email, take the user part before '@'
  if (clean.includes('@')) {
    clean = clean.split('@')[0];
  }

  // Strip trailing numbers, underscores, or special chars at the end (e.g. karansingh929 -> karansingh)
  clean = clean.replace(/[\d_.-]+$/, '');

  if (!clean) return 'Friend';

  // If input already has spaces (e.g. "kalvin smith" or "karan singh"), format tokens directly
  if (/\s+/.test(clean)) {
    return clean
      .split(/\s+/)
      .map(formatToken)
      .filter(Boolean)
      .join(' ');
  }

  // Check if there are common delimiters: '.', '_', '-', '+'
  if (/[._+-]/.test(clean)) {
    const parts = clean.split(/[._+-]+/).filter(Boolean);
    return parts
      .map(formatToken)
      .join(' ');
  }

  // Check shortcut map on single solid word
  const lowerClean = clean.toLowerCase();
  if (SHORTCUT_MAP[lowerClean]) {
    return SHORTCUT_MAP[lowerClean];
  }

  // Check camelCase boundaries (e.g. KaranSingh -> Karan Singh)
  if (/[a-z][A-Z]/.test(clean)) {
    return clean
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(formatToken)
      .join(' ');
  }

  // Check if the word ends with any known suffix / second surname (e.g. karansingh -> karan + singh)
  for (const suffix of COMMON_SUFFIXES) {
    if (lowerClean.endsWith(suffix) && lowerClean.length > suffix.length) {
      const prefix = lowerClean.slice(0, -suffix.length);
      if (prefix.length >= 1) {
        return `${formatToken(prefix)} ${formatToken(suffix)}`;
      }
    }
  }

  // Check if the word starts with any known first name (e.g. kalvinsmith -> kalvin + smith)
  for (const firstName of COMMON_FIRST_NAMES) {
    if (lowerClean.startsWith(firstName) && lowerClean.length > firstName.length) {
      const remainder = lowerClean.slice(firstName.length);
      if (remainder.length >= 2 || SHORTCUT_MAP[remainder]) {
        return `${formatToken(firstName)} ${formatToken(remainder)}`;
      }
    }
  }

  // Default fallback: title-case the cleaned word
  return formatToken(clean);
}

/**
 * Parses any recipient line or string into clean { email, name }
 */
export function parseEmailAndName(input?: string): { email: string; name: string } {
  if (!input || typeof input !== 'string') return { email: '', name: 'Friend' };
  const clean = input.trim();
  if (!clean) return { email: '', name: 'Friend' };

  // Case 1: "John Smith" <john@example.com> or John Smith <john@example.com> or <john@example.com>
  const angleMatch = clean.match(/^("?)([^"<]*)\1\s*<([^>]+)>/);
  if (angleMatch && angleMatch[3]) {
    const email = angleMatch[3].trim();
    let name = angleMatch[2]?.trim();
    if (!name) name = extractNameFromEmail(email);
    else name = name.split(/\s+/).map(formatToken).filter(Boolean).join(' ');
    return { email, name };
  }

  // Case 2: john@example.com (John Smith)
  const parenMatch = clean.match(/^([^\s(]+)\s*\(([^)]+)\)$/);
  if (parenMatch && parenMatch[1] && parenMatch[2]) {
    const email = parenMatch[1].trim();
    const name = parenMatch[2].trim().split(/\s+/).map(formatToken).filter(Boolean).join(' ');
    return { email, name };
  }

  // Case 3: comma separated on single line: John Smith, john@example.com or john@example.com, John Smith
  if (clean.includes(',') && !clean.includes(' ')) {
    const parts = clean.split(',').map(p => p.trim()).filter(Boolean);
    const emailPart = parts.find(p => p.includes('@')) || parts[0];
    const namePart = parts.find(p => !p.includes('@')) || '';
    return {
      email: emailPart,
      name: namePart ? namePart.split(/\s+/).map(formatToken).filter(Boolean).join(' ') : extractNameFromEmail(emailPart)
    };
  }

  // Case 4: Plain email address like john@example.com
  return {
    email: clean,
    name: extractNameFromEmail(clean)
  };
}

