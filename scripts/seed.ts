import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const img = (id: string) =>
  `https://images.unsplash.com/${id}?w=1600&q=80&auto=format&fit=crop`;

const IMG = {
  apt1: img("photo-1522708323590-d24dbb6b0267"),
  apt2: img("photo-1502672260266-1c1ef2d93688"),
  living: img("photo-1560448204-e02f11c3d0e2"),
  cozy: img("photo-1493809842364-78817add7ffb"),
  villa1: img("photo-1512917774080-9991f1c4c750"),
  villa2: img("photo-1613490493576-7fde63acd811"),
  beach: img("photo-1571896349842-33c89424de2d"),
  lake: img("photo-1470770841072-f978cf4d019e"),
  cabin: img("photo-1587061949409-02df41d5e562"),
  country: img("photo-1449158743715-0a90ebb6d2d8"),
};

async function createUser(input: {
  email: string;
  name: string;
  password: string;
  role?: "admin" | "user";
  image?: string;
}) {
  const hashedPassword = await hashPassword(input.password);
  const userId = crypto.randomUUID();
  return prisma.user.create({
    data: {
      id: userId,
      name: input.name,
      email: input.email,
      role: input.role ?? "user",
      image: input.image,
      accounts: {
        // better-auth expects accountId = userId and issuer = "local:<provider>"
        // for credential accounts - anything else breaks sign-in verification.
        create: {
          id: crypto.randomUUID(),
          issuer: "local:credential",
          accountId: userId,
          providerId: "credential",
          password: hashedPassword,
        },
      },
    },
  });
}

async function main() {
  console.log("🌱 Seeding...");

  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log(`⚠️  Database already has ${existing} users - skipping seed.`);
    console.log("   Run `bunx prisma migrate reset` first if you want a fresh seed.");
    return;
  }

  const admin = await createUser({
    email: process.env.SEED_ADMIN_EMAIL || "admin@safarino.local",
    password: process.env.SEED_ADMIN_PASSWORD || "Admin@12345",
    name: "مدیر سفرینو",
    role: "admin",
  });
  console.log(`👑 Admin: ${admin.email}`);

  const host1 = await createUser({
    email: "sara@safarino.local",
    password: "Host@12345",
    name: "سارا محمدی",
  });
  const host2 = await createUser({
    email: "reza@safarino.local",
    password: "Host@12345",
    name: "رضا کریمی",
  });
  const host3 = await createUser({
    email: "laura@safarino.local",
    password: "Host@12345",
    name: "Laura Smith",
  });
  const guest = await createUser({
    email: "guest@safarino.local",
    password: "Guest@12345",
    name: "علی رضایی",
  });

  const listings = [
    {
      title: "آپارتمان مدرن در قلب تهران",
      description:
        "آپارتمانی روشن و کاملاً بازسازی‌شده در محله ظفر، با دسترسی عالی به مترو، رستوران‌ها و کافه‌ها. مناسب سفرهای کاری و تفریحی.",
      category: "apartment" as const,
      amenities: ["wifi", "ac", "kitchen", "tv", "washer"],
      guestCount: 4,
      bedroomCount: 2,
      bedCount: 2,
      bathroomCount: 1,
      pricePerNight: 3_500_000,
      city: "تهران",
      province: "تهران",
      latitude: 35.7612,
      longitude: 51.4361,
      coverImage: IMG.apt1,
      images: [IMG.living, IMG.cozy],
      userId: host1.id,
    },
    {
      title: "ویلای دنج با استخر در لواسان",
      description:
        "ویلای خصوصی با استخر سرپوشیده، باغ بزرگ و نمای فوق‌العاده به کوه‌های البرز. جای پارک رایگان و باربیکیو دارد.",
      category: "villa" as const,
      amenities: ["wifi", "parking", "pool", "bbq", "heating"],
      guestCount: 8,
      bedroomCount: 3,
      bedCount: 4,
      bathroomCount: 2,
      pricePerNight: 12_000_000,
      city: "لواسان",
      province: "تهران",
      latitude: 35.7867,
      longitude: 51.7231,
      coverImage: IMG.villa1,
      images: [IMG.villa2],
      userId: host1.id,
    },
    {
      title: "بومگردی سنتی در بافت تاریخی کاشان",
      description:
        "اقامتگاه بومگردی در خانه‌ای تاریخی با حیاط مرکزی، حوض آب و اتاق‌های آینه‌کاری شده. صبحانه محلی سرو می‌شود.",
      category: "ecoLodge" as const,
      amenities: ["wifi", "breakfast", "heating", "parking"],
      guestCount: 6,
      bedroomCount: 3,
      bedCount: 3,
      bathroomCount: 2,
      pricePerNight: 2_800_000,
      city: "کاشان",
      province: "اصفهان",
      latitude: 33.9831,
      longitude: 51.4364,
      coverImage: IMG.country,
      images: [],
      userId: host2.id,
    },
    {
      title: "سوئیت روبروی دریای خزر در نوشهر",
      description:
        "چند ثانیه پیاده تا ساحل؛ سوئیتی آرام با بالکن رو به دریا و طلایی‌ترین غروب‌ها.",
      category: "beach" as const,
      amenities: ["wifi", "ac", "kitchen", "tv"],
      guestCount: 3,
      bedroomCount: 1,
      bedCount: 2,
      bathroomCount: 1,
      pricePerNight: 4_200_000,
      city: "نوشهر",
      province: "مازندران",
      latitude: 36.6497,
      longitude: 51.4961,
      coverImage: IMG.beach,
      images: [IMG.cozy],
      userId: host2.id,
    },
    {
      title: "خانه سنتی اصفهانی کنار زاینده‌رود",
      description:
        "تجربه اقامت در خانه‌ای قاجاری با گنبدهای فیروزه‌ای در فاصله چند دقیقه از میدان نقش جهان.",
      category: "traditional" as const,
      amenities: ["wifi", "breakfast", "heating", "ac"],
      guestCount: 5,
      bedroomCount: 2,
      bedCount: 3,
      bathroomCount: 1,
      pricePerNight: 5_500_000,
      city: "اصفهان",
      province: "اصفهان",
      latitude: 32.6572,
      longitude: 51.6776,
      coverImage: IMG.living,
      images: [IMG.country],
      userId: host2.id,
    },
    {
      title: "اقامتگاه کویری مرنجاب",
      description:
        "چادر و سوئیت‌های کویری با آسمان پرستاره بی‌نظیر، شترسواری و موسیقی زنده شب‌های کویر.",
      category: "desert" as const,
      amenities: ["breakfast", "parking", "bbq"],
      guestCount: 10,
      bedroomCount: 4,
      bedCount: 6,
      bathroomCount: 3,
      pricePerNight: 6_800_000,
      city: "آرا و بیده",
      province: "اصفهان",
      latitude: 34.2883,
      longitude: 51.7919,
      coverImage: IMG.cabin,
      images: [],
      userId: host1.id,
    },
    {
      title: "کلبه چوبی در جنگل‌های نم‌خور",
      description:
        "کلبه‌ای چوبی میان مه و درختان بلند؛ تجربه‌ای متفاوت برای دو نفر با شومینه و تراس جنگلی.",
      category: "mountain" as const,
      amenities: ["wifi", "heating", "parking", "bbq"],
      guestCount: 2,
      bedroomCount: 1,
      bedCount: 1,
      bathroomCount: 1,
      pricePerNight: 3_900_000,
      city: "نم‌خور",
      province: "گیلان",
      latitude: 37.1628,
      longitude: 50.2414,
      coverImage: IMG.cabin,
      images: [IMG.lake],
      userId: host1.id,
    },
    {
      title: "پنت‌هاکس لاکچری با نمای شهر",
      description:
        "پنت‌هاکس دوبلکسی با مبلمان دیزاینر، جکوزی و پنجره‌های سرتاسری رو به خط آسمان تهران.",
      category: "luxury" as const,
      amenities: ["wifi", "parking", "pool", "ac", "tv", "kitchen"],
      guestCount: 4,
      bedroomCount: 2,
      bedCount: 2,
      bathroomCount: 2,
      pricePerNight: 25_000_000,
      city: "تهران",
      province: "تهران",
      latitude: 35.7597,
      longitude: 51.4167,
      coverImage: IMG.villa2,
      images: [IMG.villa1, IMG.living],
      userId: host2.id,
    },
    {
      title: "Cozy flat near Isar river",
      description:
        "Bright and quiet one-bedroom apartment in Munich's Glockenbachviertel, steps from cafes and the river Isar.",
      category: "apartment" as const,
      amenities: ["wifi", "kitchen", "washer", "tv", "heating"],
      guestCount: 2,
      bedroomCount: 1,
      bedCount: 1,
      bathroomCount: 1,
      pricePerNight: 12_000_000,
      city: "Munich",
      province: "Bavaria",
      country: "DE",
      latitude: 48.1351,
      longitude: 11.582,
      coverImage: IMG.apt2,
      images: [IMG.apt1],
      userId: host3.id,
    },
    {
      title: "Seafront villa in Antalya",
      description:
        "Private beach access, infinity pool and a lemon garden in this Mediterranean villa perfect for families.",
      category: "beach" as const,
      amenities: ["wifi", "pool", "parking", "ac", "bbq", "kitchen"],
      guestCount: 8,
      bedroomCount: 4,
      bedCount: 5,
      bathroomCount: 3,
      pricePerNight: 45_000_000,
      city: "Antalya",
      province: "Antalya",
      country: "TR",
      latitude: 36.8969,
      longitude: 30.7133,
      coverImage: IMG.beach,
      images: [IMG.villa1],
      userId: host3.id,
    },
    {
      title: "Lakeside cabin, Lake Como",
      description:
        "A romantic wooden cabin overlooking Lake Como with morning mist over the water and hiking trails nearby.",
      category: "mountain" as const,
      amenities: ["wifi", "heating", "kitchen", "parking"],
      guestCount: 3,
      bedroomCount: 1,
      bedCount: 2,
      bathroomCount: 1,
      pricePerNight: 18_000_000,
      city: "Menaggio",
      province: "Lombardy",
      country: "IT",
      latitude: 46.0213,
      longitude: 9.2372,
      coverImage: IMG.lake,
      images: [IMG.cabin],
      userId: host3.id,
    },
    {
      title: "استودیو هنرمندانه در شیراز",
      description:
        "استودیویی با نقاشی‌های دیواری دست‌ساز، نورگیر عالی و حیاط پر از لیمو ترش؛ ده دقیقه پیاده تا حافظیه.",
      category: "apartment" as const,
      amenities: ["wifi", "ac", "kitchen"],
      guestCount: 2,
      bedroomCount: 1,
      bedCount: 1,
      bathroomCount: 1,
      pricePerNight: 2_600_000,
      city: "شیراز",
      province: "فارس",
      latitude: 29.6276,
      longitude: 52.5311,
      coverImage: IMG.cozy,
      images: [IMG.apt2],
      userId: host1.id,
    },
  ];

  for (const data of listings) {
    await prisma.listing.create({ data });
  }
  console.log(`🏠 Created ${listings.length} listings`);

  const createdListings = await prisma.listing.findMany({
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: 2,
  });
  if (createdListings.length >= 2 && guest) {
    await prisma.review.createMany({
      data: [
        {
          listingId: createdListings[0].id,
          userId: guest.id,
          rating: 5,
          comment:
            "همه‌چیز دقیقاً مثل عکس‌ها بود. میزبان بسیار پاسخگو و محل اقامت تمیز و دلنشین.",
        },
        {
          listingId: createdListings[1].id,
          userId: guest.id,
          rating: 4,
          comment:
            "استخر و باغ فوق‌العاده بود. فقط مسیر ورودی کمی خاکی است، در کل پیشنهاد می‌کنم.",
        },
      ],
    });
    console.log("⭐ Added sample reviews");
  }

  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
