import { Cormorant_Garamond, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import SkipLink from '@/components/layout/SkipLink';
import SiteChrome from '@/components/layout/SiteChrome';
import HeaderWithDrawer from '@/components/layout/HeaderWithDrawer';
import MobileBar from '@/components/layout/MobileBar';
import SiteFooter from '@/components/layout/SiteFooter';
import { site } from '@/data/site';
import { getLiveSiteConfig } from '@/lib/site-settings';

export const dynamic = 'force-dynamic';

const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-next-serif',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-next-sans',
  display: 'swap',
});

export const metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: 'Yuevaan Bhutan Travels — Licensed Tour Operator',
    template: '%s — Yuevaan Bhutan Travels',
  },
  description:
    'Officially licensed Kingdom of Bhutan tour operator based in Thimphu. Private cultural odysseys, sacred festivals, and Himalayan treks with SDF and visa included.',
  icons: {
    icon: '/logos/yuevaan-logo.png',
  },
};

const STATIC_BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/+$/, '');
const HEAD_PREPAINT_SCRIPT = `(function(){var bp=${JSON.stringify(STATIC_BASE_PATH)};var p=window.location.pathname;if(bp&&p.indexOf(bp)===0){p=p.slice(bp.length)||'/';}var doc=document.documentElement;function cleanNode(el){if(!el||el.nodeType!==1||!el.attributes)return;for(var i=el.attributes.length-1;i>=0;i--){var n=el.attributes[i].name;if(n.indexOf('bis_')===0||n.indexOf('__processed_')===0)el.removeAttribute(n);}}function cleanTree(root){if(!root)return;cleanNode(root);if(root.querySelectorAll){var list=root.querySelectorAll('[bis_skin_checked],[bis_register]');for(var i=0;i<list.length;i++){list[i].removeAttribute('bis_skin_checked');list[i].removeAttribute('bis_register');}}if(document.body)cleanNode(document.body);}window.__cleanExtAttrs=cleanTree;cleanTree(doc);if(typeof MutationObserver!=='undefined'){var mo=new MutationObserver(function(muts){for(var i=0;i<muts.length;i++){var m=muts[i];if(m.type==='attributes'&&m.attributeName&&(m.attributeName.indexOf('bis_')===0||m.attributeName.indexOf('__processed_')===0)){if(m.target&&m.target.hasAttribute&&m.target.hasAttribute(m.attributeName))m.target.removeAttribute(m.attributeName);}else if(m.type==='childList'){for(var j=0;j<m.addedNodes.length;j++){var nd=m.addedNodes[j];if(nd&&nd.nodeType===1)cleanTree(nd);}}}});mo.observe(doc,{attributes:true,childList:true,subtree:true});document.addEventListener('readystatechange',function(){cleanTree(doc);},true);window.addEventListener('DOMContentLoaded',function(){cleanTree(doc);},true);window.addEventListener('load',function(){cleanTree(doc);setTimeout(function(){mo.disconnect();},4000);},{once:true});}if(p==='/'||p==='/index.html'){doc.classList.add('js');var n=(window.performance&&performance.getEntriesByType)?performance.getEntriesByType('navigation')[0]:null;var r=n?n.type==='reload':false;var v=false;try{v=sessionStorage.getItem('yuevaan_site_visited')==='1';}catch(e){}doc.classList.add((!v||r)?'is-preloading':'skip-preloader');}else if(p==='/destinations'||p==='/destinations/'||p==='/destinations.html'){var s=['western-bhutan','central-bhutan','eastern-bhutan','southern-bhutan'];var h=(window.location.hash||'').replace('#','').toLowerCase();doc.setAttribute('data-dest-filter',s.indexOf(h)!==-1?h:'western-bhutan');}})();`;

export default async function RootLayout({ children }) {
  const siteConfig = await getLiveSiteConfig();

  return (
    <html
      lang="en"
      className={`${cormorantGaramond.variable} ${plusJakartaSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: HEAD_PREPAINT_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        <SkipLink />
        <SiteChrome
          header={<HeaderWithDrawer />}
          mobileBar={<MobileBar siteConfig={siteConfig} />}
          footer={<SiteFooter siteConfig={siteConfig} />}
        >
          {children}
        </SiteChrome>
      </body>
    </html>
  );
}
