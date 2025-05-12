import Link from "next/link";
import Image from "next/image";

const Footer = () => {
  return (
    <footer className="mt-auto text-white bg-primary">
      <div className="px-4 pt-12 pb-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center justify-center">
            <Image
              src="/logo-white.png"
              alt="Company Logo"
              className="h-auto max-w-full"
              width={150}
              height={150}
            />
          </div>
          {/* Company Details */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">Company Details</h3>
            <p className="text-sm text-muted-foreground">
              The Sandwich Bar Nassaukade B.V.
              <br />
              Nassaukade 378 H
              <br />
              1054 AD Amsterdam
              <br />
              KVK Number: 81038739
              <br />
              VAT Number: NL861900558B01
            </p>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">Contact</h3>
            <p className="text-sm text-muted-foreground">
              <a
                href="mailto:orders@thesandwichbar.nl"
                className="text-muted-foreground hover:text-white"
              >
                orders@thesandwichbar.nl
              </a>
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">Information</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-white"
                >
                  Terms and Conditions
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-white"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="flex justify-between pt-4 mt-8 text-sm text-center border-t text-muted-foreground border-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} The Sandwich Bar Nassaukade B.V.
            All rights reserved.
          </p>
          <p>
            Powered by{" "}
            <Link
              href="https://mikdevelopment.nl"
              target="_blank"
              className="font-bold transition-colors duration-300 hover:text-orange-500"
            >
              Mik Development
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
