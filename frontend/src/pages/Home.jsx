import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiArrowRight,
  HiCamera,
  HiChevronDown,
  HiCube,
  HiLightningBolt,
  HiShieldCheck,
  HiSparkles,
  HiStar,
} from 'react-icons/hi';
import { useAuth } from '@/context/AuthContext';
import arTryonImage from '@/components/assets/ar-tryon.jpg';
import braceletsImage from '@/components/assets/collection-bracelets.jpg';
import earringsImage from '@/components/assets/collection-earrings.jpg';
import nechisuttiImage from '@/components/assets/collection-nechisutti.jpg';
import necklacesImage from '@/components/assets/collection-necklaces.jpg';
import nosePinImage from '@/components/assets/collection-nosepin.jpg';
import ringsImage from '@/components/assets/collection-rings.jpg';
import heroJewelryImage from '@/components/assets/hero-jewelry.jpg';

const collections = [
  { title: 'Rings', pieces: '48 pieces', image: ringsImage },
  { title: 'Necklaces', pieces: '32 pieces', image: necklacesImage },
  { title: 'Earrings', pieces: '83 pieces', image: earringsImage },
  { title: 'Bracelets', pieces: '27 pieces', image: braceletsImage },
  { title: 'Nose Pins', pieces: '29 pieces', image: nosePinImage },
  { title: 'Nechisutti', pieces: '18 pieces', image: nechisuttiImage },
];

const testimonials = [
  {
    quote:
      'The try-on experience feels premium and believable. Customers trust what they see, so purchases happen faster.',
    name: 'Priya Menon',
    role: 'Fine Jewelry Director',
  },
  {
    quote:
      'We finally have a virtual showroom that looks as luxurious as the pieces we sell. The image quality is excellent.',
    name: 'Kavya Patel',
    role: 'Luxury Retail Consultant',
  },
  {
    quote:
      'Being able to compare necklaces, rings, and nose pins from home made decision-making easy for our bridal shoppers.',
    name: 'Meera Krishnan',
    role: 'Store Owner',
  },
];

const features = [
  {
    icon: HiLightningBolt,
    title: 'Lightning Fast',
    description: 'Real-time placement and smooth rendering that keeps the try-on experience feeling natural.',
  },
  {
    icon: HiCube,
    title: 'Highly Accurate',
    description: 'Face, ear, and neckline alignment tuned for jewelry categories that need precision.',
  },
  {
    icon: HiShieldCheck,
    title: 'Secure & Private',
    description: 'Built for shopper trust with a polished flow that respects performance and privacy.',
  },
  {
    icon: HiCamera,
    title: 'Works Everywhere',
    description: 'Designed for phones, tablets, and desktop browsers so your catalog stays accessible everywhere.',
  },
];

const pageTexture = {
  backgroundImage: [
    'radial-gradient(circle at top left, rgba(245, 215, 110, 0.14), transparent 26%)',
    'radial-gradient(circle at top right, rgba(255, 224, 102, 0.12), transparent 28%)',
    'linear-gradient(180deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px)',
    'linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px)',
  ].join(', '),
  backgroundSize: 'auto, auto, 100% 22px, 22px 100%',
};

const sectionVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

function SectionHeading({ badge, title, highlight, description, align = 'center' }) {
  const alignment = align === 'left' ? 'text-left' : 'text-center';

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
      variants={sectionVariants}
      className={`${alignment} max-w-3xl ${align === 'left' ? '' : 'mx-auto'}`}
    >
      <span className="inline-flex items-center rounded-full border border-[#C9A961]/40 bg-[#1a1409]/80 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-[#F5D76E]">
        {badge}
      </span>
      <h2 className="mt-5 text-4xl font-display font-bold leading-tight text-[#f7f0df] sm:text-5xl">
        {title} <span className="text-[#FFD700]">{highlight}</span>
      </h2>
      <p className="mt-4 text-base leading-7 text-[#b9ac90] sm:text-lg">{description}</p>
    </motion.div>
  );
}

function LuxuryButton({ to, children, secondary = false, className = '' }) {
  const baseClasses = secondary
    ? 'border border-[#C9A961] bg-transparent text-[#f7f0df] hover:bg-[#20170b]'
    : 'bg-[#F5D76E] text-[#120d05] shadow-[0_12px_30px_rgba(245,215,110,0.28)] hover:bg-[#FFD700]';

  return (
    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
      <Link
        to={to}
        className={`inline-flex items-center gap-2 rounded-full px-6 py-3 font-ui text-xs font-semibold uppercase tracking-[0.22em] transition-all duration-300 ${baseClasses} ${className}`}
      >
        {children}
      </Link>
    </motion.div>
  );
}

export default function Home() {
  const { isAuthenticated } = useAuth();
  const primaryHref = isAuthenticated ? '/try-on' : '/register';
  const secondaryHref = isAuthenticated ? '/dashboard' : '/login';

  return (
    <div className="relative overflow-hidden bg-[#080604] text-[#f7f0df]" style={pageTexture}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.15),_transparent_34%),radial-gradient(circle_at_bottom,_rgba(212,175,55,0.08),_transparent_30%)]" />

      <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden border-b border-[#241a0a] px-4 pb-10 pt-24 sm:px-6 lg:px-8">
        <img
          src={heroJewelryImage}
          alt="Luxury jewelry hero background"
          className="absolute inset-0 h-full w-full object-cover object-[64%_center] opacity-90 md:object-[68%_center] lg:object-[72%_center]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,4,2,0.97)_0%,rgba(8,6,3,0.93)_18%,rgba(8,6,4,0.62)_48%,rgba(8,6,4,0.84)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_43%,rgba(214,171,57,0.22),transparent_30%),radial-gradient(circle_at_80%_24%,rgba(214,171,57,0.18),transparent_26%),linear-gradient(180deg,rgba(11,8,4,0.45)_0%,rgba(8,6,4,0.08)_34%,rgba(8,6,4,0.72)_100%)]" />

        <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-7xl items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75 }}
            className="relative z-10 max-w-[42rem] pb-20"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-[#C9A961]/35 bg-[#161108]/75 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-[#F5D76E]">
              <HiSparkles className="h-3.5 w-3.5" />
              AI Powered Virtual Try-On
            </span>

            <h1 className="mt-10 max-w-[42rem] text-[4.2rem] font-display font-bold leading-[0.88] text-[#F5D76E] sm:text-[5.25rem] lg:text-[6.4rem]">
              Experience
              <span className="block text-[#FFD700]">Jewelry</span>
              <span className="block italic font-medium text-[#f8f0df]">Before You Buy</span>
            </h1>

            <p className="mt-8 max-w-[40rem] text-[1.15rem] leading-9 text-[#d0bc93] sm:text-[1.22rem]">
              Try on exquisite jewelry virtually with our AI-powered augmented reality. See how each piece
              looks on you instantly.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <LuxuryButton
                to={primaryHref}
                className="rounded-[1.15rem] px-8 py-4 text-sm tracking-[0.2em] shadow-[0_20px_45px_rgba(240,199,77,0.34)]"
              >
                <HiSparkles className="h-4 w-4" />
                Virtual Try-On
              </LuxuryButton>
              <LuxuryButton
                to={secondaryHref}
                secondary
                className="rounded-[1.15rem] px-8 py-4 text-sm tracking-[0.2em] shadow-[inset_0_0_0_1px_rgba(214,171,57,0.18)]"
              >
                Explore Collections
                <HiArrowRight className="h-4 w-4" />
              </LuxuryButton>
            </div>

            <p className="mt-8 text-base text-[#918365]">
              Sign in or create an account to unlock virtual try-on
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.6 }}
          className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-3 text-[#9c8d69]"
        >
          <span className="font-ui text-[11px] uppercase tracking-[0.26em]">Scroll to Explore</span>
          <motion.span
            animate={{ y: [0, 7, 0] }}
            transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#4d3a13] bg-[#120d05]/75 text-[#f7f0df]"
          >
            <HiChevronDown className="h-5 w-5" />
          </motion.span>
        </motion.div>
      </section>

      <section className="relative px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionHeading
              badge="Live AR Try-On Experience"
              title="See It On You"
              highlight="Before You Purchase"
              description="Use live camera previews to help customers visualize every piece instantly. The presentation stays elegant while the technology quietly does the hard work."
              align="left"
            />

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              variants={sectionVariants}
              className="mt-10 space-y-4"
            >
              {[
                'Live camera support with smooth jewelry placement.',
                'Luxury-focused presentation for bridal and premium collections.',
                'Strong product confidence before the customer reaches checkout.',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-[#3b2d11] bg-[#100c06]/70 px-5 py-4 text-sm leading-7 text-[#c8b99c]"
                >
                  {item}
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.75 }}
            className="relative"
          >
            <div className="absolute -top-5 right-4 z-10 rounded-full border border-[#8d6b1f]/35 bg-[#150f07]/90 px-4 py-2 text-right backdrop-blur-md">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#af8c3a]">AI Approved</p>
              <p className="text-2xl font-display font-bold text-[#f7f0df]">96.7%</p>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-[#8d6b1f]/35 bg-[#0c0905] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
              <div className="overflow-hidden rounded-[1.5rem] border border-[#2a1f0d]">
                <img
                  src={arTryonImage}
                  alt="AR try-on showcase"
                  className="h-[360px] w-full object-cover object-center sm:h-[480px] lg:h-[560px]"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            badge="Curated Collections"
            title="Timeless"
            highlight="Elegance"
            description="Browse high-intent categories presented with the rich, editorial feel your brand deserves."
          />

          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {collections.map((collection, index) => (
              <motion.article
                key={collection.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ y: -6 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.55, delay: index * 0.05 }}
                className="group relative overflow-hidden rounded-[1.8rem] border border-[#6f5520]/40 bg-[#0b0804] shadow-[0_24px_70px_rgba(0,0,0,0.38)]"
              >
                <img
                  src={collection.image}
                  alt={collection.title}
                  className="h-[320px] w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,6,4,0.08)_20%,rgba(8,6,4,0.86)_100%)]" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-[#ae8d45]">Luxury edit</p>
                  <h3 className="mt-2 text-3xl font-display font-bold text-[#fbf5e8]">{collection.title}</h3>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#d4c2a2]">{collection.pieces}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            badge="Customer Stories"
            title="Loved by"
            highlight="Thousands"
            description="Premium visual experiences build trust. These are the reactions brands want when shoppers finally see the piece on themselves."
          />

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {testimonials.map((item, index) => (
              <motion.article
                key={item.name}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.55, delay: index * 0.08 }}
                className="rounded-[1.8rem] border border-[#3c2d13] bg-[#100c06]/85 p-7 shadow-[0_18px_50px_rgba(0,0,0,0.3)]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-4xl leading-none text-[#e1bc59]">"</span>
                  <div className="flex items-center gap-1 text-[#e1bc59]">
                    {[...Array(5)].map((_, starIndex) => (
                      <HiStar key={starIndex} className="h-4 w-4" />
                    ))}
                  </div>
                </div>
                <p className="mt-5 text-base leading-7 text-[#d4c6a8]">{item.quote}</p>
                <div className="mt-8 border-t border-[#33260f] pt-5">
                  <p className="font-ui text-sm font-semibold uppercase tracking-[0.15em] text-[#f7f0df]">{item.name}</p>
                  <p className="mt-1 text-sm text-[#9c8862]">{item.role}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            badge="Why Choose Us"
            title="Advanced Features Built for"
            highlight="You"
            description="Everything is tuned for a premium buying journey, from first impression through final decision."
          />

          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <motion.article
                  key={feature.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.5, delay: index * 0.06 }}
                  className="rounded-[1.6rem] border border-[#3a2c10] bg-[#120d06]/80 p-6"
                >
                  <div className="inline-flex rounded-2xl border border-[#7b6124]/35 bg-[#1b1408] p-3 text-[#e1bc59]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-display font-bold text-[#f7f0df]">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#c1b08d]">{feature.description}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative px-4 pb-20 pt-12 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.75 }}
          className="mx-auto max-w-5xl rounded-[2.25rem] border border-[#7d6325]/40 bg-[linear-gradient(135deg,rgba(22,17,9,0.96),rgba(10,8,5,0.98))] px-6 py-14 text-center shadow-[0_30px_120px_rgba(0,0,0,0.45)] sm:px-10"
        >
          <span className="inline-flex items-center rounded-full border border-[#8d6b1f]/40 bg-[#1a1409]/80 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-[#d8b454]">
            Start Today
          </span>
          <h2 className="mt-6 text-4xl font-display font-bold leading-tight text-[#fbf5e8] sm:text-5xl">
            Ready to Transform Your Shopping Experience?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#c4b38f] sm:text-lg">
            Bring your jewelry collection to life with a homepage that feels refined, immersive, and built to convert.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <LuxuryButton to={primaryHref}>
              <HiSparkles className="h-4 w-4" />
              Get Started Free
            </LuxuryButton>
            <LuxuryButton to="/home" secondary>
              View Collections
            </LuxuryButton>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-[#241a0a] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 text-sm text-[#a99872] md:grid-cols-4">
          <div>
            <p className="font-display text-2xl font-bold text-[#f8eed9]">JewelAR</p>
            <p className="mt-4 max-w-xs leading-7">
              A luxury-first virtual jewelry experience designed for premium catalogs and confident buyers.
            </p>
          </div>

          <div>
            <p className="font-ui text-xs font-semibold uppercase tracking-[0.28em] text-[#d3ae51]">Product</p>
            <div className="mt-4 space-y-3">
              <Link to="/home" className="block transition-colors hover:text-[#f7f0df]">Collections</Link>
              <Link to={primaryHref} className="block transition-colors hover:text-[#f7f0df]">Virtual Try-On</Link>
              <Link to="/favorites" className="block transition-colors hover:text-[#f7f0df]">Favorites</Link>
            </div>
          </div>

          <div>
            <p className="font-ui text-xs font-semibold uppercase tracking-[0.28em] text-[#d3ae51]">Company</p>
            <div className="mt-4 space-y-3">
              <Link to="/register" className="block transition-colors hover:text-[#f7f0df]">Get Started</Link>
              <Link to="/dashboard" className="block transition-colors hover:text-[#f7f0df]">Dashboard</Link>
              <Link to="/history" className="block transition-colors hover:text-[#f7f0df]">History</Link>
            </div>
          </div>

          <div>
            <p className="font-ui text-xs font-semibold uppercase tracking-[0.28em] text-[#d3ae51]">Social</p>
            <div className="mt-4 space-y-3">
              <span className="block">Twitter</span>
              <span className="block">Instagram</span>
              <span className="block">Facebook</span>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-7xl border-t border-[#241a0a] pt-6 text-center text-xs uppercase tracking-[0.2em] text-[#7d6f52]">
          © 2026 JewelAR. A polished virtual collection experience for modern jewelry brands.
        </div>
      </footer>
    </div>
  );
}
