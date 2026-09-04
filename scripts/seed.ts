import 'dotenv/config'
import { hashPassword } from 'better-auth/crypto'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../app/generated/prisma/client'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

const img = (id: string) =>
  `https://images.unsplash.com/${id}?w=1600&q=80&auto=format&fit=crop`

const IMG = {
  apt1: img('photo-1522708323590-d24dbb6b0267'),
  apt2: img('photo-1502672260266-1c1ef2d93688'),
  living: img('photo-1560448204-e02f11c3d0e2'),
  cozy: img('photo-1493809842364-78817add7ffb'),
  villa1: img('photo-1512917774080-9991f1c4c750'),
  villa2: img('photo-1613490493576-7fde63acd811'),
  beach: img('photo-1571896349842-33c89424de2d'),
  lake: img('photo-1470770841072-f978cf4d019e'),
  cabin: img('photo-1587061949409-02df41d5e562'),
  country: img('photo-1449158743715-0a90ebb6d2d8'),
  house1: img('photo-1568605114967-8130f3a36994'),
  house2: img('photo-1570129477492-45c003edd2e2'),
  apt3: img('photo-1545324418-cc1a3fa10c00'),
  house3: img('photo-1580587771525-78b9dba3b914'),
}

async function createUser(input: {
  email: string
  name: string
  password: string
  role?: 'admin' | 'user'
  image?: string
}) {
  // Idempotent: re-running the seed never duplicates or rewrites users.
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, email: true },
  })
  if (existing) return existing

  const hashedPassword = await hashPassword(input.password)
  const userId = crypto.randomUUID()
  return prisma.user.create({
    data: {
      id: userId,
      name: input.name,
      email: input.email,
      role: input.role ?? 'user',
      image: input.image,
      accounts: {
        // better-auth expects accountId = userId and issuer = "local:<provider>"
        // for credential accounts - anything else breaks sign-in verification.
        create: {
          id: crypto.randomUUID(),
          issuer: 'local:credential',
          accountId: userId,
          providerId: 'credential',
          password: hashedPassword,
        },
      },
    },
  })
}

interface SeedListing {
  title: string
  description: string
  category: 'beach' | 'villa' | 'ecoLodge' | 'traditional' | 'apartment' | 'desert' | 'mountain' | 'luxury'
  type?: 'nightly' | 'monthly' | 'sale'
  amenities: string[]
  guestCount: number
  bedroomCount: number
  bedCount: number
  bathroomCount: number
  pricePerNight?: number
  monthlyRent?: number
  mortgageAmount?: number
  salePrice?: number
  city: string
  province?: string
  country?: string
  latitude?: number
  longitude?: number
  coverImage: string
  images?: string[]
  userId: string
}

/** Creates the listing unless one with the same title already exists. */
async function createListingIfMissing(data: SeedListing): Promise<boolean> {
  const existing = await prisma.listing.findFirst({
    where: { title: data.title },
    select: { id: true },
  })
  if (existing) return false

  await prisma.listing.create({
    data: {
      type: data.type ?? 'nightly',
      pricePerNight: data.pricePerNight ?? null,
      // BigInt columns: convert the plain-number literals.
      monthlyRent:
        data.type === 'monthly' ? BigInt(data.monthlyRent ?? 0) : null,
      mortgageAmount:
        data.type === 'monthly' ? BigInt(data.mortgageAmount ?? 0) : null,
      salePrice: data.type === 'sale' ? BigInt(data.salePrice ?? 0) : null,
      title: data.title,
      description: data.description,
      category: data.category,
      amenities: data.amenities,
      guestCount: data.guestCount,
      bedroomCount: data.bedroomCount,
      bedCount: data.bedCount,
      bathroomCount: data.bathroomCount,
      city: data.city,
      province: data.province ?? null,
      country: data.country ?? 'IR',
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      coverImage: data.coverImage,
      images: data.images ?? [],
      userId: data.userId,
    },
  })
  return true
}

async function main() {
  console.log('🌱 Seeding...')

  const admin = await createUser({
    email: process.env.SEED_ADMIN_EMAIL || 'admin@safarino.local',
    password: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
    name: 'مدیر املاک آرات',
    role: 'admin',
  })
  console.log(`👑 Admin: ${admin.email}`)

  const host1 = await createUser({
    email: 'sara@safarino.local',
    password: 'Host@12345',
    name: 'سارا محمدی',
  })
  const host2 = await createUser({
    email: 'reza@safarino.local',
    password: 'Host@12345',
    name: 'رضا کریمی',
  })
  const host3 = await createUser({
    email: 'laura@safarino.local',
    password: 'Host@12345',
    name: 'Laura Smith',
  })
  const guest = await createUser({
    email: 'guest@safarino.local',
    password: 'Guest@12345',
    name: 'علی رضایی',
  })

  const listings: SeedListing[] = [
    // -- Nightly stays (booked online per night) --
    {
      title: 'آپارتمان مدرن در قلب تهران',
      description:
        'آپارتمانی روشن و کاملاً بازسازی‌شده در محله ظفر، با دسترسی عالی به مترو، رستوران‌ها و کافه‌ها. مناسب سفرهای کاری و تفریحی.',
      category: 'apartment',
      type: 'nightly',
      amenities: ['wifi', 'ac', 'kitchen', 'tv', 'washer'],
      guestCount: 4,
      bedroomCount: 2,
      bedCount: 2,
      bathroomCount: 1,
      pricePerNight: 3_500_000,
      city: 'تهران',
      province: 'تهران',
      latitude: 35.7612,
      longitude: 51.4361,
      coverImage: IMG.apt1,
      images: [IMG.living, IMG.cozy],
      userId: host1.id,
    },
    {
      title: 'ویلای دنج با استخر در لواسان',
      description:
        'ویلای خصوصی با استخر سرپوشیده، باغ بزرگ و نمای فوق‌العاده به کوه‌های البرز. جای پارک رایگان و باربیکیو دارد.',
      category: 'villa',
      type: 'nightly',
      amenities: ['wifi', 'parking', 'pool', 'bbq', 'heating'],
      guestCount: 8,
      bedroomCount: 3,
      bedCount: 4,
      bathroomCount: 2,
      pricePerNight: 12_000_000,
      city: 'لواسان',
      province: 'تهران',
      latitude: 35.7867,
      longitude: 51.7231,
      coverImage: IMG.villa1,
      images: [IMG.villa2],
      userId: host1.id,
    },
    {
      title: 'بومگردی سنتی در بافت تاریخی کاشان',
      description:
        'اقامتگاه بومگردی در خانه‌ای تاریخی با حیاط مرکزی، حوض آب و اتاق‌های آینه‌کاری شده. صبحانه محلی سرو می‌شود.',
      category: 'ecoLodge',
      type: 'nightly',
      amenities: ['wifi', 'breakfast', 'heating', 'parking'],
      guestCount: 6,
      bedroomCount: 3,
      bedCount: 3,
      bathroomCount: 2,
      pricePerNight: 2_800_000,
      city: 'کاشان',
      province: 'اصفهان',
      latitude: 33.9831,
      longitude: 51.4364,
      coverImage: IMG.country,
      userId: host2.id,
    },
    {
      title: 'سوئیت روبروی دریای خزر در نوشهر',
      description:
        'چند ثانیه پیاده تا ساحل؛ سوئیتی آرام با بالکن رو به دریا و طلایی‌ترین غروب‌ها.',
      category: 'beach',
      type: 'nightly',
      amenities: ['wifi', 'ac', 'kitchen', 'tv'],
      guestCount: 3,
      bedroomCount: 1,
      bedCount: 2,
      bathroomCount: 1,
      pricePerNight: 4_200_000,
      city: 'نوشهر',
      province: 'مازندران',
      latitude: 36.6497,
      longitude: 51.4961,
      coverImage: IMG.beach,
      images: [IMG.cozy],
      userId: host2.id,
    },
    {
      title: 'خانه سنتی اصفهانی کنار زاینده‌رود',
      description:
        'تجربه اقامت در خانه‌ای قاجاری با گنبدهای فیروزه‌ای در فاصله چند دقیقه از میدان نقش جهان.',
      category: 'traditional',
      type: 'nightly',
      amenities: ['wifi', 'breakfast', 'heating', 'ac'],
      guestCount: 5,
      bedroomCount: 2,
      bedCount: 3,
      bathroomCount: 1,
      pricePerNight: 5_500_000,
      city: 'اصفهان',
      province: 'اصفهان',
      latitude: 32.6572,
      longitude: 51.6776,
      coverImage: IMG.living,
      images: [IMG.country],
      userId: host2.id,
    },
    {
      title: 'اقامتگاه کویری مرنجاب',
      description:
        'چادر و سوئیت‌های کویری با آسمان پرستاره بی‌نظیر، شترسواری و موسیقی زنده شب‌های کویر.',
      category: 'desert',
      type: 'nightly',
      amenities: ['breakfast', 'parking', 'bbq'],
      guestCount: 10,
      bedroomCount: 4,
      bedCount: 6,
      bathroomCount: 3,
      pricePerNight: 6_800_000,
      city: 'آرا و بیده',
      province: 'اصفهان',
      latitude: 34.2883,
      longitude: 51.7919,
      coverImage: IMG.cabin,
      userId: host1.id,
    },
    {
      title: 'کلبه چوبی در جنگل‌های نم‌خور',
      description:
        'کلبه‌ای چوبی میان مه و درختان بلند؛ تجربه‌ای متفاوت برای دو نفر با شومینه و تراس جنگلی.',
      category: 'mountain',
      type: 'nightly',
      amenities: ['wifi', 'heating', 'parking', 'bbq'],
      guestCount: 2,
      bedroomCount: 1,
      bedCount: 1,
      bathroomCount: 1,
      pricePerNight: 3_900_000,
      city: 'نم‌خور',
      province: 'گیلان',
      latitude: 37.1628,
      longitude: 50.2414,
      coverImage: IMG.cabin,
      images: [IMG.lake],
      userId: host1.id,
    },
    {
      title: 'پنت‌هاکس لاکچری با نمای شهر',
      description:
        'پنت‌هاکس دوبلکسی با مبلمان دیزاینر، جکوزی و پنجره‌های سرتاسری رو به خط آسمان تهران.',
      category: 'luxury',
      type: 'nightly',
      amenities: ['wifi', 'parking', 'pool', 'ac', 'tv', 'kitchen'],
      guestCount: 4,
      bedroomCount: 2,
      bedCount: 2,
      bathroomCount: 2,
      pricePerNight: 25_000_000,
      city: 'تهران',
      province: 'تهران',
      latitude: 35.7597,
      longitude: 51.4167,
      coverImage: IMG.villa2,
      images: [IMG.villa1, IMG.living],
      userId: host2.id,
    },
    {
      title: 'Cozy flat near Isar river',
      description:
        "Bright and quiet one-bedroom apartment in Munich's Glockenbachviertel, steps from cafes and the river Isar.",
      category: 'apartment',
      type: 'nightly',
      amenities: ['wifi', 'kitchen', 'washer', 'tv', 'heating'],
      guestCount: 2,
      bedroomCount: 1,
      bedCount: 1,
      bathroomCount: 1,
      pricePerNight: 12_000_000,
      city: 'Munich',
      province: 'Bavaria',
      country: 'DE',
      latitude: 48.1351,
      longitude: 11.582,
      coverImage: IMG.apt2,
      images: [IMG.apt1],
      userId: host3.id,
    },
    {
      title: 'Seafront villa in Antalya',
      description:
        'Private beach access, infinity pool and a lemon garden in this Mediterranean villa perfect for families.',
      category: 'beach',
      type: 'nightly',
      amenities: ['wifi', 'pool', 'parking', 'ac', 'bbq', 'kitchen'],
      guestCount: 8,
      bedroomCount: 4,
      bedCount: 5,
      bathroomCount: 3,
      pricePerNight: 45_000_000,
      city: 'Antalya',
      province: 'Antalya',
      country: 'TR',
      latitude: 36.8969,
      longitude: 30.7133,
      coverImage: IMG.beach,
      images: [IMG.villa1],
      userId: host3.id,
    },
    {
      title: 'Lakeside cabin, Lake Como',
      description:
        'A romantic wooden cabin overlooking Lake Como with morning mist over the water and hiking trails nearby.',
      category: 'mountain',
      type: 'nightly',
      amenities: ['wifi', 'heating', 'kitchen', 'parking'],
      guestCount: 3,
      bedroomCount: 1,
      bedCount: 2,
      bathroomCount: 1,
      pricePerNight: 18_000_000,
      city: 'Menaggio',
      province: 'Lombardy',
      country: 'IT',
      latitude: 46.0213,
      longitude: 9.2372,
      coverImage: IMG.lake,
      images: [IMG.cabin],
      userId: host3.id,
    },
    {
      title: 'استودیو هنرمندانه در شیراز',
      description:
        'استودیویی با نقاشی‌های دیواری دست‌ساز، نورگیر عالی و حیاط پر از لیمو ترش؛ ده دقیقه پیاده تا حافظیه.',
      category: 'apartment',
      type: 'nightly',
      amenities: ['wifi', 'ac', 'kitchen'],
      guestCount: 2,
      bedroomCount: 1,
      bedCount: 1,
      bathroomCount: 1,
      pricePerNight: 2_600_000,
      city: 'شیراز',
      province: 'فارس',
      latitude: 29.6276,
      longitude: 52.5311,
      coverImage: IMG.cozy,
      images: [IMG.apt2],
      userId: host1.id,
    },

    // -- Monthly rentals (رهن و اجاره: refundable deposit + monthly rent) --
    {
      title: 'آپارتمان ۸۰ متری در سعادت‌آباد',
      description:
        'آپارتمان نوساز با آسانسور و پارکینگ، نزدیک به پارک ساعی و مراکز خرید. مناسب زوج‌ها و خانواده‌های کوچک. قرارداد حداقل یک‌ساله.',
      category: 'apartment',
      type: 'monthly',
      amenities: ['parking', 'ac', 'heating', 'kitchen'],
      guestCount: 3,
      bedroomCount: 2,
      bedCount: 2,
      bathroomCount: 1,
      mortgageAmount: 500_000_000,
      monthlyRent: 15_000_000,
      city: 'تهران',
      province: 'تهران',
      latitude: 35.7817,
      longitude: 51.3798,
      coverImage: IMG.apt3,
      images: [IMG.living],
      userId: host1.id,
    },
    {
      title: 'سوئیت ۶۰ متری یوسف‌آباد - رهن کامل',
      description:
        'سوئیت بازسازی‌شده با کابینت‌های جدید و کف سرامیک، در محلهای آرام با دسترسی عالی به مترو. رهن کامل بدون اجاره ماهانه.',
      category: 'apartment',
      type: 'monthly',
      amenities: ['ac', 'kitchen', 'heating'],
      guestCount: 2,
      bedroomCount: 1,
      bedCount: 1,
      bathroomCount: 1,
      mortgageAmount: 2_000_000_000,
      monthlyRent: 0,
      city: 'تهران',
      province: 'تهران',
      latitude: 35.7318,
      longitude: 51.4043,
      coverImage: IMG.apt1,
      userId: host2.id,
    },
    {
      title: 'خانه ویلایی دنج در کرج',
      description:
        'خانه ویلایی با حیاط ۱۰۰ متری، درختان میوه و انبار، در کوچه‌ای امن و آرام. مناسب خانواده‌های پرجمعیت.',
      category: 'villa',
      type: 'monthly',
      amenities: ['parking', 'heating', 'kitchen', 'bbq'],
      guestCount: 6,
      bedroomCount: 3,
      bedCount: 3,
      bathroomCount: 2,
      mortgageAmount: 200_000_000,
      monthlyRent: 8_000_000,
      city: 'کرج',
      province: 'البرز',
      latitude: 35.8401,
      longitude: 50.9391,
      coverImage: IMG.house1,
      images: [IMG.country],
      userId: host1.id,
    },
    {
      title: 'آپارتمان مبله در مشهد نزدیک حرم',
      description:
        'آپارتمان کاملاً مبله در بلوار سرشار، ده دقیقه پیاده تا حرم مطهر. مناسب زائران و خانواده‌ها؛ قرارداد کوتاه‌مدت هم قابل توافق است.',
      category: 'apartment',
      type: 'monthly',
      amenities: ['wifi', 'ac', 'tv', 'kitchen', 'washer', 'heating'],
      guestCount: 4,
      bedroomCount: 2,
      bedCount: 2,
      bathroomCount: 1,
      mortgageAmount: 300_000_000,
      monthlyRent: 12_000_000,
      city: 'مشهد',
      province: 'خراسان رضوی',
      latitude: 36.2861,
      longitude: 59.6157,
      coverImage: IMG.apt2,
      images: [IMG.cozy],
      userId: host2.id,
    },
    {
      title: 'ویلای دوبلکس ساحلی در رامسر',
      description:
        'ویلای دوبلکس با دسترسی مستقیم به ساحل، تراس رو به دریا و فضای سبز اختصاصی. اجاره بلندمدت برای ساکنان منطقه.',
      category: 'beach',
      type: 'monthly',
      amenities: ['parking', 'ac', 'heating', 'bbq'],
      guestCount: 6,
      bedroomCount: 3,
      bedCount: 4,
      bathroomCount: 2,
      mortgageAmount: 800_000_000,
      monthlyRent: 20_000_000,
      city: 'رامسر',
      province: 'مازندران',
      latitude: 36.9029,
      longitude: 50.6736,
      coverImage: IMG.beach,
      images: [IMG.villa2],
      userId: host1.id,
    },

    // -- Properties for sale (فروش) --
    {
      title: 'آپارتمان ۱۲۰ متری تهرانپارس',
      description:
        'آپارتمان ۱۲۰ متری با دو پارکینگ و انباری، طبقه سوم با آسانسور، نما استون و لابی مجلل. سند تک‌برگ و آماده انتقال.',
      category: 'apartment',
      type: 'sale',
      amenities: ['parking', 'ac', 'heating'],
      guestCount: 5,
      bedroomCount: 2,
      bedCount: 2,
      bathroomCount: 2,
      salePrice: 6_500_000_000,
      city: 'تهران',
      province: 'تهران',
      latitude: 35.7399,
      longitude: 51.5569,
      coverImage: IMG.apt3,
      images: [IMG.living, IMG.cozy],
      userId: host2.id,
    },
    {
      title: 'ویلای دوبلکس لواسان با استخر',
      description:
        'ویلای دوبلکس ۳۵۰ متری روی زمین ۷۰۰ متری با استخر سرپوشیده، آلاچیق و نمای کوهستان. موقعیت فوق‌العاده برای سکونت دائم.',
      category: 'villa',
      type: 'sale',
      amenities: ['parking', 'pool', 'heating', 'bbq'],
      guestCount: 8,
      bedroomCount: 4,
      bedCount: 4,
      bathroomCount: 3,
      salePrice: 25_000_000_000,
      city: 'لواسان',
      province: 'تهران',
      latitude: 35.7935,
      longitude: 51.7103,
      coverImage: IMG.house3,
      images: [IMG.villa1, IMG.villa2],
      userId: host1.id,
    },
    {
      title: 'آپارتمان ۹۰ متری در اصفهان - نزدیک سی‌وسه‌پل',
      description:
        'آپارتمان نوساز با منظره زاینده‌رود، پنجره‌های بزرگ و نورگیری عالی. نزدیک به مراکز خرید و خط بی‌آرتی.',
      category: 'apartment',
      type: 'sale',
      amenities: ['parking', 'ac', 'heating'],
      guestCount: 4,
      bedroomCount: 2,
      bedCount: 2,
      bathroomCount: 1,
      salePrice: 4_800_000_000,
      city: 'اصفهان',
      province: 'اصفهان',
      latitude: 32.6446,
      longitude: 51.6675,
      coverImage: IMG.apt1,
      images: [IMG.country],
      userId: host2.id,
    },
    {
      title: 'خانه تاریخی بازسازی‌شده در کاشان',
      description:
        'خانه‌ای قاجاری با حیاط مرکزی و بادگیر، بازسازی‌شده با مصالح سنتی. مناسب اقامتگاه بومگردی یا سکونت خاص؛ پتانسیل عالی سرمایه‌گذاری.',
      category: 'traditional',
      type: 'sale',
      amenities: ['heating', 'parking'],
      guestCount: 8,
      bedroomCount: 4,
      bedCount: 5,
      bathroomCount: 3,
      salePrice: 12_000_000_000,
      city: 'کاشان',
      province: 'اصفهان',
      latitude: 33.9852,
      longitude: 51.4123,
      coverImage: IMG.country,
      images: [IMG.living],
      userId: host2.id,
    },
    {
      title: 'پنت‌هاکس ۲۰۰ متری الهیه',
      description:
        'پنت‌هاکس لاکچری با تراس خصوصی ۸۰ متری، نمای شهر و دریاچه چیتگر. تمام امکانات هوشمند ساختمانی و لابی منشی‌دار.',
      category: 'luxury',
      type: 'sale',
      amenities: ['parking', 'pool', 'ac', 'heating', 'tv'],
      guestCount: 4,
      bedroomCount: 3,
      bedCount: 3,
      bathroomCount: 3,
      salePrice: 60_000_000_000,
      city: 'تهران',
      province: 'تهران',
      latitude: 35.7702,
      longitude: 51.4147,
      coverImage: IMG.villa2,
      images: [IMG.living, IMG.apt1],
      userId: host2.id,
    },
  ]

  let createdCount = 0
  for (const data of listings) {
    if (await createListingIfMissing(data)) createdCount++
  }
  console.log(`🏠 Listings: ${createdCount} created, ${listings.length - createdCount} already present`)

  // Sample reviews for the first two nightly stays (idempotent).
  const firstTwo = await prisma.listing.findMany({
    where: { type: 'nightly' },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
    take: 2,
  })
  if (firstTwo.length >= 2 && guest) {
    const reviewData = [
      {
        listingId: firstTwo[0].id,
        userId: guest.id,
        rating: 5,
        comment:
          'همه‌چیز دقیقاً مثل عکس‌ها بود. میزبان بسیار پاسخگو و محل اقامت تمیز و دلنشین.',
      },
      {
        listingId: firstTwo[1].id,
        userId: guest.id,
        rating: 4,
        comment:
          'استخر و باغ فوق‌العاده بود. فقط مسیر ورودی کمی خاکی است، در کل پیشنهاد می‌کنم.',
      },
    ]
    for (const review of reviewData) {
      const exists = await prisma.review.findUnique({
        where: { listingId_userId: { listingId: review.listingId, userId: review.userId } },
        select: { id: true },
      })
      if (!exists) {
        await prisma.review.create({ data: review })
        console.log('⭐ Added sample review')
      }
    }
  }

  console.log('✅ Seed complete')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
