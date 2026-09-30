"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Mail, Phone } from "lucide-react";

const linkClass = "text-cream/75 transition-colors hover:text-cream";

const Footer = () => {
  const pathname = usePathname();
  // Sanity Studio takes the whole screen; no site footer underneath it.
  if (pathname?.startsWith("/studio")) return null;

  return (
    <footer className="site-footer mt-auto bg-plum text-cream">
      <div className="mx-auto max-w-[1440px] px-4 pb-8 pt-14 md:px-10 md:pt-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-5">
            <Image
              src="/images/logo-catering.png"
              alt="The Sandwich Bar Catering"
              width={88}
              height={88}
              className="h-[88px] w-[88px] rounded-full shadow-[0_0_0_2px_rgba(253,244,229,0.3)]"
            />
            <div className="flex flex-col">
              <span className="text-2xl font-extrabold uppercase leading-none tracking-[-0.04em]">
                Fresh sandwiches,
              </span>
              <span className="mt-2 font-tomatoes text-[32px] lowercase leading-[1.05] text-sun md:text-4xl">
                delivered to your office.
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 text-sm">
            <h3 className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-cream/60">Contact</h3>
            <a href="mailto:orders@thesandwichbar.nl" className={`flex items-center gap-2 ${linkClass}`}>
              <Mail className="h-4 w-4" />
              orders@thesandwichbar.nl
            </a>
            <a href="tel:+31615004988" className={`flex items-center gap-2 ${linkClass}`}>
              <Phone className="h-4 w-4" />
              +31 6 15 00 49 88
            </a>
            <a href="tel:+31615657447" className={`flex items-center gap-2 ${linkClass}`}>
              <Phone className="h-4 w-4" />
              +31 6 15 65 74 47
            </a>
          </div>

          <div className="flex flex-col gap-3 text-sm">
            <h3 className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-cream/60">Company details</h3>
            <p className="m-0 leading-relaxed text-cream/75">
              The Sandwich Bar Heisteeg B.V.
              <br />
              Amstelveenseweg 156
              <br />
              1075 XN Amsterdam
              <br />
              KVK: 81038984
              <br />
              VAT: NL861900637B01
            </p>
          </div>

          <div className="flex flex-col gap-3 text-sm">
            <h3 className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-cream/60">Information</h3>
            <Link href="/terms" className={linkClass}>
              Terms and Conditions
            </Link>
            <Link href="/privacy" className={linkClass}>
              Privacy Policy
            </Link>
            <Link href="/quote/lookup" className={linkClass}>
              Load a quote
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-cream/15 pt-6 text-xs text-cream/60 sm:flex-row sm:justify-between">
          <p className="m-0">
            &copy; {new Date().getFullYear()} The Sandwich Bar Heisteeg B.V. All rights reserved.
          </p>
          <p className="m-0">
            Powered by{" "}
            <a
              href="https://squared-media.nl"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-cream/80 transition-colors hover:text-cream"
            >
              Squared Media
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
