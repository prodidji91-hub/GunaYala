import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('====================================================');
console.log('   RUNNING PART 26 SEO VERIFICATION TEST MATRIX');
console.log('====================================================');

let testsPassed = 0;
let testsFailed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    testsPassed++;
  } catch (err: any) {
    console.error(`[FAIL] ${name}:`, err.message);
    testsFailed++;
  }
}

// 1. Verify index.html Title & Description
runTest('Test 1: index.html contains approved title and description without unverified claims', () => {
  const htmlPath = path.resolve(process.cwd(), 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');

  assert.ok(
    html.includes('<title>San Blas Islands Tours Panama | Guna Yala Panama Travel</title>'),
    'index.html should have approved English title'
  );
  assert.ok(
    html.includes('content="Explore the San Blas Islands with Guna Yala Panama Travel. Discover day trips, overnight island stays, sailing experiences and authentic Guna culture."'),
    'index.html should have approved meta description'
  );
  assert.ok(
    !html.includes('5.0 Google rating'),
    'index.html must not contain unverified 5.0 Google rating claim in metadata'
  );
});

// 2. Verify metadata.json
runTest('Test 2: metadata.json has approved description without unverified claims', () => {
  const metaPath = path.resolve(process.cwd(), 'metadata.json');
  const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

  assert.strictEqual(
    metadata.description,
    'Explore the San Blas Islands with Guna Yala Panama Travel. Discover day trips, overnight island stays, sailing experiences and authentic Guna culture.'
  );
  assert.ok(
    !metadata.description.includes('5.0 Google rating'),
    'metadata.json must not include unverified rating'
  );
});

// 3. Verify public/robots.txt
runTest('Test 3: public/robots.txt exists and properly secures non-public paths', () => {
  const robotsPath = path.resolve(process.cwd(), 'public/robots.txt');
  assert.ok(fs.existsSync(robotsPath), 'public/robots.txt must exist');
  const robots = fs.readFileSync(robotsPath, 'utf-8');

  assert.ok(robots.includes('User-agent: *'), 'Must specify User-agent: *');
  assert.ok(robots.includes('Allow: /'), 'Must allow root');
  assert.ok(robots.includes('Allow: /terms-and-conditions'), 'Must allow terms');
  assert.ok(robots.includes('Disallow: /admin'), 'Must disallow /admin');
  assert.ok(robots.includes('Disallow: /api/'), 'Must disallow /api/');
  assert.ok(robots.includes('Disallow: /.netlify/'), 'Must disallow /.netlify/');
  assert.ok(robots.includes('Disallow: /island-design-preview'), 'Must disallow preview route');
  assert.ok(
    robots.includes('Sitemap: https://gunayalapanama.com/sitemap.xml'),
    'Must reference sitemap.xml'
  );
});

// 4. Verify public/sitemap.xml
runTest('Test 4: public/sitemap.xml lists valid indexable routes with hreflang alternates', () => {
  const sitemapPath = path.resolve(process.cwd(), 'public/sitemap.xml');
  assert.ok(fs.existsSync(sitemapPath), 'public/sitemap.xml must exist');
  const sitemap = fs.readFileSync(sitemapPath, 'utf-8');

  assert.ok(sitemap.includes('<loc>https://gunayalapanama.com/</loc>'), 'Must include root URL');
  assert.ok(sitemap.includes('<loc>https://gunayalapanama.com/?lang=es</loc>'), 'Must include Spanish root URL');
  assert.ok(sitemap.includes('<loc>https://gunayalapanama.com/terms-and-conditions</loc>'), 'Must include terms hub');
  assert.ok(sitemap.includes('<loc>https://gunayalapanama.com/terms-and-conditions/day-tour</loc>'), 'Must include day tour terms');
  assert.ok(sitemap.includes('<loc>https://gunayalapanama.com/terms-and-conditions/overnight</loc>'), 'Must include overnight terms');
  assert.ok(!sitemap.includes('/admin'), 'Must NOT include /admin in sitemap');
  assert.ok(!sitemap.includes('/api'), 'Must NOT include /api in sitemap');
  assert.ok(sitemap.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'), 'Must include xhtml namespace');
  assert.ok(sitemap.includes('hreflang="en"'), 'Must have en hreflang');
  assert.ok(sitemap.includes('hreflang="es"'), 'Must have es hreflang');
  assert.ok(sitemap.includes('hreflang="x-default"'), 'Must have x-default hreflang');
});

// 5. Verify index.html Canonical & Reciprocal Hreflangs
runTest('Test 5: index.html specifies canonical URL and reciprocal hreflang annotations', () => {
  const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');

  assert.ok(
    html.includes('<link rel="canonical" href="https://gunayalapanama.com/" />'),
    'Must have canonical tag'
  );
  assert.ok(
    html.includes('<link rel="alternate" hreflang="en" href="https://gunayalapanama.com/" />'),
    'Must have alternate hreflang="en"'
  );
  assert.ok(
    html.includes('<link rel="alternate" hreflang="es" href="https://gunayalapanama.com/?lang=es" />'),
    'Must have alternate hreflang="es"'
  );
  assert.ok(
    html.includes('<link rel="alternate" hreflang="x-default" href="https://gunayalapanama.com/" />'),
    'Must have alternate hreflang="x-default"'
  );
});

// 6. Verify Schema.org JSON-LD Structure
runTest('Test 6: index.html contains valid Schema.org graph with real details and no fabricated data', () => {
  const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(jsonLdMatch, 'Must contain application/ld+json script');

  const schema = JSON.parse(jsonLdMatch[1]);
  assert.strictEqual(schema['@context'], 'https://schema.org');
  assert.ok(Array.isArray(schema['@graph']), '@graph must be an array');

  const agency = schema['@graph'].find((item: any) => item['@type'] === 'TravelAgency');
  assert.ok(agency, 'Must contain TravelAgency schema');
  assert.strictEqual(agency.name, 'Guna Yala Panama Travel');
  assert.strictEqual(agency.url, 'https://gunayalapanama.com');
  assert.strictEqual(agency.telephone, '+507-6444-3649');
  assert.strictEqual(agency.email, 'hello@gunayalapanamatravel.com');

  // Verify no fabricated ratings or fake street addresses
  assert.strictEqual(agency.aggregateRating, undefined, 'Must not invent aggregateRating');
  assert.strictEqual(agency.review, undefined, 'Must not invent fake reviews');

  const website = schema['@graph'].find((item: any) => item['@type'] === 'WebSite');
  assert.ok(website, 'Must contain WebSite schema');
  assert.strictEqual(website.url, 'https://gunayalapanama.com');

  const trips = schema['@graph'].filter((item: any) => item['@type'] === 'TouristTrip');
  assert.ok(trips.length >= 3, 'Must define at least 3 TouristTrip offerings (day, overnight, sailing)');
});

// 7. Verify OpenGraph and Twitter Card tags
runTest('Test 7: index.html has complete OpenGraph and Twitter Card absolute image metadata', () => {
  const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');

  assert.ok(html.includes('<meta property="og:image" content="https://gunayalapanama.com/pictures/header1.jpg" />'));
  assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image" />'));
  assert.ok(html.includes('<meta name="twitter:image" content="https://gunayalapanama.com/pictures/header1.jpg" />'));
  assert.ok(html.includes('<meta property="og:locale" content="en_US" />'));
  assert.ok(html.includes('<meta property="og:locale:alternate" content="es_PA" />'));
});

// 8. Verify SEO TypeScript module
runTest('Test 8: src/utils/seo.ts provides distinct bilingual metadata for all routes', () => {
  const seoPath = path.resolve(process.cwd(), 'src/utils/seo.ts');
  assert.ok(fs.existsSync(seoPath), 'src/utils/seo.ts must exist');
  const seoSource = fs.readFileSync(seoPath, 'utf-8');

  assert.ok(seoSource.includes('San Blas Islands Tours Panama | Guna Yala Panama Travel'));
  assert.ok(seoSource.includes('Tours en Islas San Blas Panamá | Guna Yala Panama Travel'));
  assert.ok(seoSource.includes('San Blas Day Trips from Panama City | Guna Yala Panama Travel'));
  assert.ok(seoSource.includes('Pasadías en San Blas desde Ciudad de Panamá | Guna Yala Panama Travel'));
  assert.ok(seoSource.includes('San Blas Overnight Stays & Island Experiences | Guna Yala Panama Travel'));
  assert.ok(seoSource.includes('Estadías y Cabañas en Islas San Blas | Guna Yala Panama Travel'));
  assert.ok(seoSource.includes('San Blas Sailing & Private Charters | Guna Yala Panama Travel'));
  assert.ok(seoSource.includes('Veleros y Catamaranes en San Blas Panamá | Guna Yala Panama Travel'));
});

// 9. Verify Sitemap contains all 6 landing pages
runTest('Test 9: public/sitemap.xml lists all 6 landing routes with reciprocal language alternates', () => {
  const sitemap = fs.readFileSync(path.resolve(process.cwd(), 'public/sitemap.xml'), 'utf-8');

  const expectedRoutes = [
    'https://gunayalapanama.com/san-blas-day-trips',
    'https://gunayalapanama.com/es/san-blas-day-trips',
    'https://gunayalapanama.com/san-blas-overnight-stays',
    'https://gunayalapanama.com/es/san-blas-overnight-stays',
    'https://gunayalapanama.com/san-blas-sailing',
    'https://gunayalapanama.com/es/san-blas-sailing',
  ];

  for (const r of expectedRoutes) {
    assert.ok(sitemap.includes(`<loc>${r}</loc>`), `Sitemap must include ${r}`);
  }
});

// 10. Verify Prerendered HTML Files exist and contain unique Titles, Canonicals, and H1s
runTest('Test 10: Prerendered landing HTML files exist and contain appropriate metadata and content', () => {
  const pages = [
    {
      file: 'public/san-blas-day-trips/index.html',
      lang: 'en',
      title: 'San Blas Day Trips from Panama City | Guna Yala Panama Travel',
      canonical: 'https://gunayalapanama.com/san-blas-day-trips',
      h1: 'San Blas Day Trips from Panama City',
    },
    {
      file: 'public/es/san-blas-day-trips/index.html',
      lang: 'es',
      title: 'Pasadías en San Blas desde Ciudad de Panamá | Guna Yala Panama Travel',
      canonical: 'https://gunayalapanama.com/es/san-blas-day-trips',
      h1: 'Pasadías en San Blas desde Ciudad de Panamá',
    },
    {
      file: 'public/san-blas-overnight-stays/index.html',
      lang: 'en',
      title: 'San Blas Overnight Stays & Island Experiences | Guna Yala Panama Travel',
      canonical: 'https://gunayalapanama.com/san-blas-overnight-stays',
      h1: 'San Blas Overnight Stays & Island Experiences',
    },
    {
      file: 'public/es/san-blas-overnight-stays/index.html',
      lang: 'es',
      title: 'Estadías y Cabañas en Islas San Blas | Guna Yala Panama Travel',
      canonical: 'https://gunayalapanama.com/es/san-blas-overnight-stays',
      h1: 'Estadías y Cabañas en Islas San Blas',
    },
    {
      file: 'public/san-blas-sailing/index.html',
      lang: 'en',
      title: 'San Blas Sailing & Private Charters | Guna Yala Panama Travel',
      canonical: 'https://gunayalapanama.com/san-blas-sailing',
      h1: 'San Blas Sailing & Private Charters',
    },
    {
      file: 'public/es/san-blas-sailing/index.html',
      lang: 'es',
      title: 'Veleros y Catamaranes en San Blas Panamá | Guna Yala Panama Travel',
      canonical: 'https://gunayalapanama.com/es/san-blas-sailing',
      h1: 'Veleros y Catamaranes en San Blas Panamá',
    },
  ];

  for (const p of pages) {
    const fullPath = path.resolve(process.cwd(), p.file);
    assert.ok(fs.existsSync(fullPath), `Prerendered file must exist: ${p.file}`);
    const content = fs.readFileSync(fullPath, 'utf-8');

    assert.ok(content.includes(`<html lang="${p.lang}"`), `${p.file} must have lang="${p.lang}"`);
    assert.ok(content.includes(`<title>${p.title}</title>`), `${p.file} must have title "${p.title}"`);
    assert.ok(content.includes(`<link rel="canonical" href="${p.canonical}" />`), `${p.file} must have canonical "${p.canonical}"`);
    assert.ok(content.includes(`<h1 class="text-3xl sm:text-5xl font-serif text-white">${p.h1}</h1>`), `${p.file} must have H1 "${p.h1}"`);
  }
});

// 11. Verify Landing Page Schema.org JSON-LD contains BreadcrumbList and TouristTrip
runTest('Test 11: Prerendered HTML contains valid BreadcrumbList and TouristTrip schema without fake reviews', () => {
  const samplePath = path.resolve(process.cwd(), 'public/san-blas-sailing/index.html');
  const html = fs.readFileSync(samplePath, 'utf-8');
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(jsonLdMatch, 'Must contain application/ld+json script');

  const schema = JSON.parse(jsonLdMatch[1]);
  assert.strictEqual(schema['@context'], 'https://schema.org');
  assert.ok(Array.isArray(schema['@graph']), '@graph must be an array');

  const breadcrumbs = schema['@graph'].find((item: any) => item['@type'] === 'BreadcrumbList');
  assert.ok(breadcrumbs, 'Must contain BreadcrumbList schema');
  assert.strictEqual(breadcrumbs.itemListElement.length, 2);

  const trip = schema['@graph'].find((item: any) => item['@type'] === 'TouristTrip');
  assert.ok(trip, 'Must contain TouristTrip schema');
  assert.strictEqual(trip.provider['@id'], 'https://gunayalapanama.com/#organization');
  assert.strictEqual(trip.aggregateRating, undefined, 'Must not invent aggregateRating');
});

// 12. Verify Geographical and Tour Claims Accuracy
runTest('Test 12: Prerendered HTML and components have accurate geography and verified claims (no Pacific stars)', () => {
  const landingComp = fs.readFileSync(path.resolve(process.cwd(), 'src/components/landing/LandingExperiencePage.tsx'), 'utf-8');
  assert.ok(!landingComp.includes('Pacific stars'), 'LandingExperiencePage must not mention Pacific stars');
  assert.ok(landingComp.includes('Caribbean stars'), 'LandingExperiencePage must mention Caribbean stars');

  const prerenderScript = fs.readFileSync(path.resolve(process.cwd(), 'scripts/prerender-landing-pages.ts'), 'utf-8');
  assert.ok(!prerenderScript.includes('Pacific stars'), 'prerender script must not mention Pacific stars');

  const overnightHtml = fs.readFileSync(path.resolve(process.cwd(), 'public/san-blas-overnight-stays/index.html'), 'utf-8');
  assert.ok(!overnightHtml.includes('Pacific stars'), 'Prerendered overnight HTML must not mention Pacific stars');
  assert.ok(overnightHtml.includes('Caribbean stars'), 'Prerendered overnight HTML must mention Caribbean stars');
});

// 13. Verify Hashed Production Assets in dist/ Prerendered Pages
runTest('Test 13: Prerendered HTML in dist/ references real hashed production JS and CSS bundles', () => {
  const distOvernight = path.resolve(process.cwd(), 'dist/san-blas-overnight-stays/index.html');
  if (fs.existsSync(distOvernight)) {
    const html = fs.readFileSync(distOvernight, 'utf-8');
    assert.ok(/\/assets\/index-[A-Za-z0-9_-]+\.js/.test(html), 'dist HTML must reference hashed JS asset');
    assert.ok(/\/assets\/index-[A-Za-z0-9_-]+\.css/.test(html), 'dist HTML must reference hashed CSS asset');
    assert.ok(!html.includes('/src/main.tsx'), 'dist HTML must not reference raw development /src/main.tsx');
  }
});

// 14. Verify Netlify Routing & Redirect Precedence
runTest('Test 14: Netlify routing preserves static file priority while forcing API proxy', () => {
  const redirects = fs.readFileSync(path.resolve(process.cwd(), 'public/_redirects'), 'utf-8');
  // API routes must have ! (force)
  assert.ok(/\/api\/booking-request\s+\/\.netlify\/functions\/booking-request\s+200!/.test(redirects), 'API booking must force 200!');
  assert.ok(/\/api\/\*\s+\/\.netlify\/functions\/:splat\s+200!/.test(redirects), 'API splat must force 200!');
  // SPA fallback must NOT have ! (so static files like /san-blas-day-trips take precedence)
  const lines = redirects.split('\n');
  const spaFallbackLine = lines.find((l) => l.startsWith('/* ') && l.includes('/index.html'));
  assert.ok(spaFallbackLine, 'Must have SPA fallback rule');
  assert.ok(!spaFallbackLine.includes('200!'), 'SPA fallback rule must NOT be forced (200 without !) so static landing pages are served first');

  const netlifyToml = fs.readFileSync(path.resolve(process.cwd(), 'netlify.toml'), 'utf-8');
  assert.ok(netlifyToml.includes('from = "/api/*"'));
  assert.ok(netlifyToml.includes('force = true'), 'netlify.toml must force API redirects');
});

// 15. Verify Landing Route Normalization & Trailing Slash Tolerance (Part 27.2)
runTest('Test 15: normalizePath and getLandingRouteInfo correctly resolve all 6 URLs with and without trailing slashes, index.html, and queries', async () => {
  const { normalizePath, getLandingRouteInfo } = await import('../src/utils/landingRoutes');

  // Verify normalizePath
  assert.strictEqual(normalizePath('/san-blas-day-trips'), '/san-blas-day-trips');
  assert.strictEqual(normalizePath('/san-blas-day-trips/'), '/san-blas-day-trips');
  assert.strictEqual(normalizePath('/SAN-BLAS-DAY-TRIPS///'), '/san-blas-day-trips');
  assert.strictEqual(normalizePath('/san-blas-day-trips/index.html'), '/san-blas-day-trips');
  assert.strictEqual(normalizePath('/san-blas-day-trips.html'), '/san-blas-day-trips');
  assert.strictEqual(normalizePath('https://gunayalapanama.com/san-blas-day-trips/?ref=google'), '/san-blas-day-trips');

  // Verify all 6 routes in English and Spanish
  const cases: { input: string; expectedType: string | null; expectedLang: string | null }[] = [
    // English Day Trips
    { input: '/san-blas-day-trips', expectedType: 'day-trips', expectedLang: 'en' },
    { input: '/san-blas-day-trips/', expectedType: 'day-trips', expectedLang: 'en' },
    { input: '/san-blas-day-trips.html', expectedType: 'day-trips', expectedLang: 'en' },
    { input: '/san-blas-day-trips/index.html', expectedType: 'day-trips', expectedLang: 'en' },
    // Spanish Day Trips
    { input: '/es/san-blas-day-trips', expectedType: 'day-trips', expectedLang: 'es' },
    { input: '/es/san-blas-day-trips/', expectedType: 'day-trips', expectedLang: 'es' },
    { input: '/es/san-blas-day-trips.html', expectedType: 'day-trips', expectedLang: 'es' },
    // English Overnight Stays
    { input: '/san-blas-overnight-stays', expectedType: 'overnight-stays', expectedLang: 'en' },
    { input: '/san-blas-overnight-stays/', expectedType: 'overnight-stays', expectedLang: 'en' },
    { input: '/san-blas-overnight-stays.html', expectedType: 'overnight-stays', expectedLang: 'en' },
    // Spanish Overnight Stays
    { input: '/es/san-blas-overnight-stays', expectedType: 'overnight-stays', expectedLang: 'es' },
    { input: '/es/san-blas-overnight-stays/', expectedType: 'overnight-stays', expectedLang: 'es' },
    { input: '/es/san-blas-overnight-stays.html', expectedType: 'overnight-stays', expectedLang: 'es' },
    // English Sailing
    { input: '/san-blas-sailing', expectedType: 'sailing', expectedLang: 'en' },
    { input: '/san-blas-sailing/', expectedType: 'sailing', expectedLang: 'en' },
    { input: '/san-blas-sailing.html', expectedType: 'sailing', expectedLang: 'en' },
    // Spanish Sailing
    { input: '/es/san-blas-sailing', expectedType: 'sailing', expectedLang: 'es' },
    { input: '/es/san-blas-sailing/', expectedType: 'sailing', expectedLang: 'es' },
    { input: '/es/san-blas-sailing.html', expectedType: 'sailing', expectedLang: 'es' },
    // Non-landing routes should resolve to null
    { input: '/', expectedType: null, expectedLang: null },
    { input: '/?lang=es', expectedType: null, expectedLang: null },
    { input: '/admin', expectedType: null, expectedLang: null },
    { input: '/terms-and-conditions', expectedType: null, expectedLang: null },
  ];

  for (const c of cases) {
    const res = getLandingRouteInfo(c.input);
    assert.strictEqual(
      res.type,
      c.expectedType,
      `Failed route matching for ${c.input}: expected type ${c.expectedType}, got ${res.type}`
    );
    assert.strictEqual(
      res.lang,
      c.expectedLang,
      `Failed lang matching for ${c.input}: expected lang ${c.expectedLang}, got ${res.lang}`
    );
  }
});

// 16. Verify dist/ Static Files for all 6 Landing Pages (both folder and clean URL)
runTest('Test 16: dist/ contains both directory index.html and standalone .html for all 6 landing pages', () => {
  const routes = [
    { dir: 'san-blas-day-trips', file: 'san-blas-day-trips.html', h1: 'San Blas Day Trips from Panama City' },
    { dir: 'es/san-blas-day-trips', file: 'es/san-blas-day-trips.html', h1: 'Pasadías en San Blas desde Ciudad de Panamá' },
    { dir: 'san-blas-overnight-stays', file: 'san-blas-overnight-stays.html', h1: 'San Blas Overnight Stays & Island Experiences' },
    { dir: 'es/san-blas-overnight-stays', file: 'es/san-blas-overnight-stays.html', h1: 'Estadías y Cabañas en Islas San Blas' },
    { dir: 'san-blas-sailing', file: 'san-blas-sailing.html', h1: 'San Blas Sailing & Private Charters' },
    { dir: 'es/san-blas-sailing', file: 'es/san-blas-sailing.html', h1: 'Veleros y Catamaranes en San Blas Panamá' },
  ];

  for (const r of routes) {
    const dirHtml = path.resolve(process.cwd(), 'dist', r.dir, 'index.html');
    const flatHtml = path.resolve(process.cwd(), 'dist', r.file);

    assert.ok(fs.existsSync(dirHtml), `dist/${r.dir}/index.html must exist`);
    assert.ok(fs.existsSync(flatHtml), `dist/${r.file} must exist`);

    const dirContent = fs.readFileSync(dirHtml, 'utf-8');
    const flatContent = fs.readFileSync(flatHtml, 'utf-8');

    assert.ok(dirContent.includes(r.h1), `${dirHtml} must contain H1 "${r.h1}"`);
    assert.ok(flatContent.includes(r.h1), `${flatHtml} must contain H1 "${r.h1}"`);
  }
});

// 17. Verify Explicit Landing Redirects in public/_redirects
runTest('Test 17: public/_redirects defines explicit 200 rules for all 6 landing pages before SPA fallback', () => {
  const redirects = fs.readFileSync(path.resolve(process.cwd(), 'public/_redirects'), 'utf-8');
  const requiredRules = [
    '/san-blas-day-trips',
    '/san-blas-day-trips/',
    '/es/san-blas-day-trips',
    '/es/san-blas-day-trips/',
    '/san-blas-overnight-stays',
    '/san-blas-overnight-stays/',
    '/es/san-blas-overnight-stays',
    '/es/san-blas-overnight-stays/',
    '/san-blas-sailing',
    '/san-blas-sailing/',
    '/es/san-blas-sailing',
    '/es/san-blas-sailing/',
  ];

  const spaIdx = redirects.indexOf('/*                           /index.html                             200');
  assert.ok(spaIdx > -1, 'Must contain SPA fallback');

  for (const r of requiredRules) {
    const idx = redirects.indexOf(r);
    assert.ok(idx > -1, `public/_redirects must contain rule for "${r}"`);
    assert.ok(idx < spaIdx, `Rule for "${r}" must be positioned BEFORE SPA fallback`);
  }
});

// 18. Verify Explicit Landing Redirects in netlify.toml
runTest('Test 18: netlify.toml defines explicit 200 redirects for all 6 landing pages before /* fallback', () => {
  const toml = fs.readFileSync(path.resolve(process.cwd(), 'netlify.toml'), 'utf-8');
  const requiredPaths = [
    '/san-blas-day-trips',
    '/san-blas-day-trips/',
    '/es/san-blas-day-trips',
    '/es/san-blas-day-trips/',
    '/san-blas-overnight-stays',
    '/san-blas-overnight-stays/',
    '/es/san-blas-overnight-stays',
    '/es/san-blas-overnight-stays/',
    '/san-blas-sailing',
    '/san-blas-sailing/',
    '/es/san-blas-sailing',
    '/es/san-blas-sailing/',
  ];

  const catchAllIdx = toml.lastIndexOf('from = "/*"');
  assert.ok(catchAllIdx > -1, 'Must contain /* fallback in netlify.toml');

  for (const p of requiredPaths) {
    const pathIdx = toml.indexOf(`from = "${p}"`);
    assert.ok(pathIdx > -1, `netlify.toml must contain redirect from "${p}"`);
    assert.ok(pathIdx < catchAllIdx, `Redirect from "${p}" must be positioned before /* fallback`);
  }
});

console.log('----------------------------------------------------');
console.log(`TOTAL: ${testsPassed + testsFailed} tests | PASSED: ${testsPassed} | FAILED: ${testsFailed}`);
console.log('----------------------------------------------------');

if (testsFailed > 0) {
  process.exit(1);
}


