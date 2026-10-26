import type { Vendor } from "./types";

/**
 * The 34 vendors listed on eastmeetswed.com as of October 2026.
 * `story`, contact details and socials come from each vendor's own listing (typos fixed, long
 * paragraphs split). `discipline`, `lede` and `quote` are an editorial layer drawn only from
 * that copy. Never add facts (prices, reviews, years, awards) a vendor hasn't published.
 *
 * Images: set `cover` and `gallery` to paths under /public (e.g. "/images/vendors/<slug>/cover.jpg").
 * Anything left unset renders as an art-directed placeholder.
 */
export const vendors: Vendor[] = 
[
  {
    slug: "at-last-film-and-photography",
    name: "At Last Film & Photography",
    discipline: "Film & photography",
    services: [
      "Photographer",
      "Videographer"
    ],
    serviceArea: [
      "VIC"
    ],
    languages: [
      "Thai",
      "Vietnamese"
    ],
    lede: "Calm and reassuring on the day, then cinema-grade colour in the edit.",
    quote: "We’re crafting a film that’s actually about our couple.",
    story: [
      "We create films that capture our couple’s stories and unique wedding day experience. A large part of our process is truly getting to know our couples so that we’re not just creating a wedding video that happens to feature our couple but instead we’re crafting a film that’s actually about our couple.",
      "On the day you’ll experience us as calm, fun and reassuring voices who want to make sure you’re truly enjoying the day. In the background we’ll be working hard to capture the subtle and the grand moments of your day as they unfold.",
      "Once your day’s been captured we’ll take time to review everything we’ve captured in depth to find the story that connects it all. Finally once we’ve locked in the edit we’ll do a proper colouring pass on the film so you’re getting something that looks like it belongs on a cinema screen."
    ],
    signoff: "Andrew Dinh",
    contact: {
      email: "hello@atlast.studio",
      website: "https://atlast.studio/"
    },
    socials: {
      instagram: "https://www.instagram.com/atlastfilmandphotography/",
      facebook: "https://www.facebook.com/profile.php?id=100089893237466"
    },
    featured: true
  },
  {
    slug: "folkstone-weddings",
    name: "Folkstone Weddings",
    discipline: "Documentary photography",
    services: [
      "Photographer"
    ],
    based: "Melbourne",
    serviceArea: [
      "VIC"
    ],
    languages: [
      "Cantonese",
      "English"
    ],
    lede: "Candid photographs and nostalgic camcorder video, for couples who care about the in-between.",
    quote: "The grand gestures matter just as much as the in-between moments.",
    story: [
      "Hi, I’m Dani!",
      "I specialise in wedding photography for couples who want a candid and documentary-style approach. I also offer camcorder video for a nostalgic keepsake that feels just like the day it happened. I draw from a talented team of photo and video assistants to document your wedding day without imposition. Folkstone is the perfect photographer for those who know in their hearts that the grand gestures matter just as much as the in-between moments.",
      "I also coach couples to channel their unique connection and personalities throughout their planning so their wedding feels authentic. I know that what I do is more than just photography – they are irreplaceable mementos from one of the most important milestones in your love story.",
      "Folkstone is an inclusive vendor with lived experience navigating the wedding industry. All love is welcome here.",
      "Schedule a free call with me – I can’t wait to meet you!"
    ],
    signoff: "Daniele Martinie (she/any) & Martin Maras (he/him)",
    contact: {
      email: "weddings@folkstone.co",
      website: "https://www.folkstone.co/"
    },
    socials: {
      instagram: "https://www.instagram.com/folkstoneweddings/"
    },
    featured: true
  },
  {
    slug: "gdpt-dai-bi-quan-am-lion-dance",
    name: "Dai Bi Quan Am Lion Dance",
    discipline: "Lion dance troupe",
    services: [
      "Entertainment"
    ],
    based: "Melbourne",
    serviceArea: [
      "VIC"
    ],
    languages: [
      "Vietnamese",
      "English"
    ],
    lede: "A non-profit troupe with more than thirty years of performances, choreographed around your theme.",
    quote: "Blending tradition with vibrant energy.",
    story: [
      "We are a Melbourne-based non-profit lion dance troupe, delivering thrilling and culturally rich lion dance performances for all occasions. Being established for over 30 years, our experience and exhilarating lion dance performances will elevate your wedding entertainment as we bring joy, luck, and excitement to all.",
      "Bring your special day to life with a captivating lion dance performance tailored to your vision. Our performances are custom-choreographed to suit your unique theme, blending tradition with vibrant energy to create an unforgettable experience. Choose from a wide range of lion styles and colours to complement your wedding décor and personal style. Whether you’re aiming for classic elegance or bold celebration, we work closely with you to ensure every detail aligns perfectly with your celebration."
    ],
    contact: {
      email: "info@dbqaliondance.com.au",
      phone: "0413 328 150",
      website: "http://www.dbqaliondance.com.au"
    },
    socials: {
      instagram: "https://www.instagram.com/dbqaliondance",
      facebook: "https://www.facebook.com/daibiquanamliondance",
      youtube: "https://www.youtube.com/@DaiBiQuanAmLionDance"
    },
    featured: true
  },
  {
    slug: "katrina-lai",
    name: "Katrina Lai",
    discipline: "Celebrant & MC",
    services: [
      "Celebrant",
      "MC"
    ],
    serviceArea: [
      "VIC"
    ],
    languages: [
      "Cantonese",
      "Mandarin",
      "Hakka",
      "English"
    ],
    lede: "Celebrant, tea ceremony and reception MC in English, Cantonese, Mandarin and Hakka.",
    quote: "Your ABC (Aus-born Chinese) certified hypewoman who can unite your love in different languages.",
    story: [
      "Your ABC (Aus-born Chinese) certified hypewoman who can unite your love in different languages",
      "Providing Celebrant, Tea Ceremony and Reception MC services in English, Cantonese, Mandarin and Hakka"
    ],
    contact: {
      email: "Contact@katrinalai.com.au",
      website: "https://katrinalai.com.au/"
    },
    socials: {
      instagram: "https://www.instagram.com/katrinalai_mc"
    },
    featured: true
  },
  {
    slug: "candy-ng-art",
    name: "Candy Ng Art",
    discipline: "Live wedding illustration",
    services: [
      "Entertainment",
      "Favours and Gifts"
    ],
    serviceArea: [
      "VIC"
    ],
    languages: [
      "Cantonese",
      "Mandarin"
    ],
    lede: "Live portraits of your guests, drawn in their wedding finery as the night unfolds.",
    quote: "I will ensure that every guest feels seen and appreciated.",
    story: [
      "Live wedding illustration is a unique and unforgettable experience for the couple and their guests alike, and it is my most popular offering.",
      "I specialise in capturing the charm and elegance of the guests and their outfits at weddings. I will ensure that every guest feels seen and appreciated through my illustrations. It’s the best way to let the guests know how important they are."
    ],
    contact: {
      email: "Hello@candyngart.com",
      website: "https://www.candyngart.com"
    },
    socials: {
      instagram: "https://www.instagram.com/candyngart/",
      facebook: "https://www.facebook.com/candyngart"
    },
    featured: true
  },
  {
    slug: "sugar-bee-flowers",
    name: "Sugar bee Flowers",
    discipline: "Floral styling",
    services: [
      "Florist"
    ],
    serviceArea: [
      "VIC"
    ],
    languages: [
      "Japanese"
    ],
    lede: "Statement ceremony pieces and hanging installations, designed around the season.",
    quote: "We are intentional about the floral designs and seasonality of the florals.",
    story: [
      "We are a boutique weddings and event flower stylist with 15 years experience. We are intentional about the floral designs and seasonality of the florals. We specialise in luxury weddings, in particular, creating statement ceremony centrepieces and hanging installations that create lasting impressions of the special day."
    ],
    contact: {
      email: "info@sugarbeeflowers.com.au",
      website: "https://sugarbeeflowers.com.au/"
    },
    socials: {
      instagram: "https://www.instagram.com/sugarbeeflowers"
    },
    featured: true
  },
  {
    slug: "invictus-quartet",
    name: "Invictus Quartet",
    discipline: "String quartet",
    services: [
      "Entertainment"
    ],
    serviceArea: [
      "VIC"
    ],
    languages: [
      "Cantonese",
      "Korean",
      "Mandarin"
    ],
    lede: "Classical strings that blur the lines between styles, so your guests never quite know what’s next.",
    quote: "Music with a new perspective.",
    story: [
      "Music with a new perspective.",
      "Invictus Quartet are here to help you curate music that YOU are in love with and will say ‘I Do’ to. We are redefining what classical string instruments can do and blur the lines between different styles. We love to mix and match so it is fresh and fun to keep the ears guessing what they might hear next."
    ],
    contact: {
      email: "hello@invictusquartet.com",
      website: "https://invictusquartet.com"
    },
    socials: {
      instagram: "https://www.instagram.com/invictusquartet/",
      facebook: "https://www.facebook.com/invictusquartet"
    },
    featured: true
  },
  {
    slug: "christine-civil-celebrant",
    name: "Christine Civil Celebrant",
    discipline: "Civil celebrant",
    services: [
      "Celebrant",
      "MC"
    ],
    serviceArea: [
      "VIC"
    ],
    languages: [
      "Cantonese"
    ],
    lede: "Teochew heritage, a Cambodian-born dad, a Vietnamese-born mum, and ceremonies written entirely around you.",
    quote: "I will embrace all of your cultural traditions.",
    story: [
      "As well as happily marrying couples on weekends and weeknights, I have a full time job as a Product Owner in eCommerce. All the personal and professional opportunities I have been presented with have equipped me with the skills necessary to be the wedding celebrant of your choice.",
      "I am described as bubbly and thrive on building relationships with people. I have been lucky enough to have achieved my dream of travelling to all 6 ‘relevant’ continents, and these experiences have instilled within me an adaptable, easy-going nature and an appreciation for multiculturalism. Therefore I will embrace all of your cultural traditions, and warmly welcome the opportunity to travel across Australia, and abroad.",
      "I have a Chinese (Teochew) heritage and can speak Cantonese and some Teochew and Mandarin. Dad was born in Cambodia and Mum in Vietnam! If you wish for parts of your ceremony to be spoken in a different language, I am more than happy to attempt it because I love learning elements of different languages! To date I have been lucky enough to have also spoken bits of Vietnamese, Tagalog (Filipino), Arabic, French, Italian and Cambodian in some ceremonies.",
      "I am extremely keen to conduct a themed/dress-up ceremony – Harry Potter, Game of Thrones, Disney etc – any theme would excite me! Please ask me to dress up and write you a ceremony set in an alternate universe!",
      "If any of the above resonates with you, let’s organise an obligation free coffee catch up to discuss how we can bring your dream wedding to life. After interviewing you, I specialise in writing personalised ceremonies that focus on you. I am flexible and can cater for your preferred ceremony style, although my default is to bring smiles to everyone’s faces by marrying you with heart and humour. Please know I consider this profession of mine an absolute privilege, and I would be blessed to share this journey with you.",
      "And HOORAY! Marriage Equality in Australia is now a reality! It would be my honour to officiate these ceremonies. Can’t wait to hear from interested parties of the LGBT community!"
    ],
    contact: {
      email: "christine@christinecivilcelebrant.com.au"
    },
    socials: {
      instagram: "https://www.instagram.com/christinecivilcelebrant",
      facebook: "https://www.facebook.com/christinecivilcelebrant"
    },
    featured: true
  },
  {
    slug: "aldin-ortinez",
    name: "Aldin Ortinez",
    discipline: "Wedding films",
    services: [
      "Videographer"
    ],
    serviceArea: [
      "VIC"
    ],
    lede: "Wedding films that hold on to tradition, and to the two of you.",
    quote: "Capturing the essence of tradition and timeless love.",
    story: [
      "Capturing the essence of tradition and timeless love, our wedding films transform moments into cherished memories.",
      "Crafting unforgettable wedding films that beautifully encapsulate the essence of your special day, transforming moments into cherished memories to be treasured for a lifetime."
    ],
    contact: {
      email: "aldin@aldinortinez.com",
      website: "https://www.aldinortinez.com"
    },
    socials: {
      instagram: "https://www.instagram.com/aldinortinez"
    },
    featured: false
  },
  {
    slug: "amerta-entertainment",
    name: "Amerta Entertainment",
    discipline: "Live music",
    services: [
      "Entertainment",
      "Music"
    ],
    based: "Melbourne",
    serviceArea: [
      "VIC"
    ],
    languages: [
      "Indonesian",
      "English"
    ],
    lede: "A live band that moves easily from an intimate acoustic set to a full dance floor.",
    quote: "We create immersive musical experiences.",
    story: [
      "At Amerta Entertainment, we create immersive musical experiences.",
      "From intimate acoustic sets to high-energy full band performances."
    ],
    contact: {
      email: "bookings@amertaentertainment.com"
    },
    socials: {
      instagram: "https://www.instagram.com/amerta_ent",
      facebook: "https://www.facebook.com/profile.php?id=61577281101524"
    },
    featured: false
  },
  {
    slug: "celebrant-jam",
    name: "Celebrant Jam",
    discipline: "Celebrant & MC",
    services: [
      "Celebrant",
      "MC",
      "Content Creator"
    ],
    based: "Kensington",
    serviceArea: [
      "VIC"
    ],
    languages: [
      "Mandarin"
    ],
    lede: "Born in Shanghai, raised in Melbourne, and here to make your ceremony fun.",
    quote: "I am deeply inspired by the diversity and range of influences around me.",
    story: [
      "Let’s make some magic! My name is Jamima Yue Xiu Wu, an intentional party starter. Born in Shanghai, raised in Melbourne, and now a local resident of Kensington.",
      "I am deeply inspired by the diversity and range of influences around me. I have a background in hospitality, retail, fashion, advertising and education. I have danced at many festivals, travelled to distant lands, married my love in Las Vegas and started our own little family.",
      "I am many things to many people and I would love to be your celebrant. I have always taken an interest in people and their stories. It would be my absolute pleasure to work with you to create a unique and, most of all, fun wedding ceremony experience.",
      "I look forward to sharing the journey ahead with you as your Celebrant JAM."
    ],
    signoff: "Jamima Yue Xiu Wu",
    contact: {
      email: "Jam@celebrantjam.com",
      website: "https://www.celebrantjam.com"
    },
    socials: {
      instagram: "https://www.instagram.com/celebrant_jam",
      facebook: "https://www.facebook.com/celebrantjam"
    },
    featured: false
  },
  {
    slug: "citrus-7-photography",
    name: "Citrus 7 Photography",
    discipline: "Wedding photography",
    services: [
      "Photographer"
    ],
    serviceArea: [
      "VIC"
    ],
    lede: "Timeless, editorial photography, up close to the anticipation, the tears and the joy.",
    quote: "To the joy, tears and everything in between.",
    story: [
      "My name is Kai from Citrus 7 Photography. I offer a personalised wedding photography service that emphasizes the timeless and editorial aspects of my couple’s special day. My goal is to capture all the anticipation, love, tears, and joy up close, preserving the raw emotions for the years to come."
    ],
    signoff: "Kai",
    featured: false
  },
  {
    slug: "daniella-bui-makeup-artistry",
    name: "Daniella Bui Makeup Artistry",
    discipline: "Bridal makeup",
    services: [
      "Hair & Makeup"
    ],
    based: "Thomastown",
    serviceArea: [
      "VIC"
    ],
    lede: "Bridal and event makeup, on location or from a studio in Thomastown.",
    story: [
      "Melbourne makeup artist for bridal, events and shoots.",
      "Available to travel, or by appointment at a studio in Thomastown."
    ],
    contact: {
      email: "danibuimua@gmail.com"
    },
    featured: false
  },
  {
    slug: "dillon-reyn-live-event-illustration",
    name: "Dillon & Reyn",
    discipline: "Live event illustration",
    services: [
      "Entertainment",
      "Favours and Gifts"
    ],
    based: "Melbourne",
    serviceArea: [
      "VIC"
    ],
    languages: [
      "Indonesian",
      "English"
    ],
    lede: "Bespoke illustrations of your guests, made live and kept for good.",
    quote: "Capturing your precious memories in a way that is both unique and deeply personal.",
    story: [
      "Nothing brings us more joy than capturing your precious memories of your wedding in a way that is both unique and deeply personal.",
      "Invite your guests and loved ones into your elevated celebration with their very own bespoke illustrations, perfect for keepsakes to keep the memory of your special day alive."
    ],
    contact: {
      email: "hello@dillonandreyn.com",
      phone: "0411170477",
      website: "https://www.dillonandreyn.com"
    },
    socials: {
      instagram: "https://www.instagram.com/dillonandreyn"
    },
    featured: false
  },
  {
    slug: "dlux-photobooth",
    name: "DLUX Photobooth",
    discipline: "Photobooths",
    services: [
      "Photobooth"
    ],
    based: "Melbourne",
    serviceArea: [
      "VIC"
    ],
    languages: [
      "Vietnamese",
      "English"
    ],
    lede: "Customisable photobooths with themed backdrops and props, run start to finish by their own team.",
    quote: "A unique and engaging way to capture the joy and spontaneity of your celebrations.",
    story: [
      "We specialise in creating unforgettable experiences at your events with our state-of-the-art photobooths.",
      "Whether it’s a wedding, corporate event, birthday party or any special occasion, our photobooths add a touch of fun and excitement. We offer a variety of customisable options, including themed backgrounds, props and instant social media sharing, ensuring your guests leave with lasting memories.",
      "Our professional and friendly staff handle everything from setup to breakdown, allowing you to focus on enjoying your event."
    ],
    contact: {
      email: "hello@dluxphotobooth.com.au",
      phone: "0498 989 941",
      website: "http://www.dluxphotobooth.com.au"
    },
    socials: {
      instagram: "https://www.instagram.com/dlux.photobooth",
      facebook: "https://www.facebook.com/dluxphotoboothmelbourne/"
    },
    featured: false
  },
  {
    slug: "elusana",
    name: "Elusana",
    discipline: "Chinese traditional attire",
    services: [
      "Attire"
    ],
    serviceArea: [
      "VIC"
    ],
    lede: "A Melbourne online boutique for Chinese traditional outfits.",
    story: [
      "As an online boutique business based in Melbourne, our passion is to help our customers find the perfect Chinese traditional outfit for their next occasion."
    ],
    contact: {
      email: "Elusana02@gmail.com",
      website: "https://www.elusana.com.au/"
    },
    socials: {
      instagram: "https://www.instagram.com/_elusana/"
    },
    featured: false
  },
  {
    slug: "gabiera-film-photographer",
    name: "Gabiera",
    discipline: "Film photography",
    services: [
      "Photographer",
      "Videographer"
    ],
    based: "Melbourne",
    serviceArea: [
      "ACT",
      "NSW",
      "NT",
      "QLD",
      "SA",
      "TAS",
      "VIC",
      "WA"
    ],
    lede: "Weddings shot on film, anywhere in Australia.",
    quote: "Capturing love on film is truly something special.",
    story: [
      "Wedding film photographer. Capturing love on film is truly something special."
    ],
    signoff: "Gabe",
    contact: {
      email: "hi@gabiera.com",
      website: "http://gabiera.com"
    },
    socials: {
      instagram: "https://www.instagram.com/gabiera.film/"
    },
    featured: false
  },
  {
    slug: "indelibleink-calligraphy",
    name: "IndelibleInk Calligraphy",
    discipline: "Calligraphy & engraving",
    services: [
      "Favours and Gifts",
      "Stationery and Signage"
    ],
    serviceArea: [
      "VIC"
    ],
    languages: [
      "Vietnamese",
      "English"
    ],
    lede: "Handwritten place cards and marriage certificates, invitation design, envelope addressing and perfume engraving.",
    quote: "A true reflection of your love story.",
    story: [
      "A creative design and calligraphy studio, we specialise in calligraphy and engraving services, including handwritten place cards, handwritten marriage certificates, wedding invitation design, envelope addressing and perfume engraving.",
      "From elegantly designed menus to intricately crafted place cards, every element can be tailored to your vision, ensuring that your special day is not only memorable but also a true reflection of your love story. Enquire within."
    ],
    contact: {
      email: "claire@indelibleinkcalligraphy.com",
      website: "https://indelibleinkcalligraphy.com/"
    },
    socials: {
      instagram: "https://www.instagram.com/indelibleinkcalligraphy/",
      facebook: "https://www.facebook.com/indelibleinkcalligraphy"
    },
    featured: false
  },
  {
    slug: "jayess-events",
    name: "JayEss Events",
    discipline: "Live music & MC",
    services: [
      "MC",
      "Music"
    ],
    languages: [
      "Filipino"
    ],
    lede: "Live music, crowd work, and an MC who brings humour and showmanship.",
    quote: "Using music and showmanship to entertain and delight.",
    story: [
      "Playing live music and interacting with the crowd: live entertainment using music, and dynamic event hosting as MC using humour and showmanship.",
      "Using music and showmanship to entertain and delight."
    ],
    signoff: "Jay & Ian",
    contact: {
      email: "Ian@jayessevents.com"
    },
    socials: {
      instagram: "https://www.instagram.com/jayessevents.au/",
      facebook: "https://www.facebook.com/jayessevents"
    },
    featured: false
  },
  {
    slug: "jayteehair",
    name: "Jayteehair",
    discipline: "Bridal hair",
    services: [
      "Hair & Makeup"
    ],
    based: "Rowville",
    serviceArea: [
      "VIC"
    ],
    languages: [
      "Teochew",
      "English"
    ],
    lede: "Soft, wispy, effortless styling that lasts the entire day and night.",
    quote: "Everything effortless.",
    story: [
      "A Melbourne-based hairstyling service that specialises in everything effortless – from the service you receive, to the hairstyle on your head.",
      "Known for her soft, wispy and effortless styling, Jenn will help you create a hairstyle that will make you look and feel beautiful. Jenn always ensures that everything is sitting comfortably and securely to last the entire day and night."
    ],
    contact: {
      email: "info@jayteehair.com",
      website: "http://www.jayteehair.com"
    },
    socials: {
      instagram: "https://www.instagram.com/jayteehair/"
    },
    featured: false
  },
  {
    slug: "kindred-visuals",
    name: "Kindred Visuals",
    discipline: "Wedding photography",
    services: [
      "Photographer"
    ],
    serviceArea: [
      "VIC"
    ],
    lede: "Epic photography for your wedding day, by Adrian Dong.",
    story: [
      "Epic photography for your special day by Adrian Dong"
    ],
    signoff: "Adrian Dong",
    contact: {
      email: "hello@kindredvisuals.com"
    },
    socials: {
      instagram: "https://www.instagram.com/kindred_visuals",
      facebook: "https://www.facebook.com/kindredvisuals"
    },
    featured: false
  },
  {
    slug: "makeup-by-elly-liana",
    name: "Makeup by Elly Liana",
    discipline: "Hair & makeup",
    services: [
      "Hair & Makeup"
    ],
    serviceArea: [
      "VIC"
    ],
    languages: [
      "Indonesian"
    ],
    lede: "Hair and makeup for weddings and special events, based in Melbourne.",
    story: [
      "Hair and makeup artist based in Melbourne, specialised in weddings and special events."
    ],
    contact: {
      email: "info@ellyliana.com",
      website: "https://www.ellyliana.com"
    },
    socials: {
      instagram: "https://www.instagram.com/makeupbyellyliana/",
      facebook: "https://www.facebook.com/makeupbyellyliana/"
    },
    featured: false
  },
  {
    slug: "melbourne-harp-piano-deon-entwisle",
    name: "Melbourne Harp Piano",
    person: "Deon Entwisle",
    discipline: "Harp & piano",
    services: [
      "Music"
    ],
    serviceArea: [
      "VIC"
    ],
    languages: [
      "Mandarin"
    ],
    lede: "Harp and piano for weddings and events.",
    quote: "Elegant, timeless and romantic.",
    story: [
      "Elegant, timeless and romantic. Deon provides harp and piano music for weddings and events."
    ],
    contact: {
      email: "deon.nld@gmail.com",
      website: "https://melbourneharppiano.com.au/"
    },
    socials: {
      instagram: "https://www.instagram.com/melbourneharppiano/"
    },
    featured: false
  },
  {
    slug: "mona-chungchao-civil-marriage-celebrant",
    name: "Mona ChungChao",
    discipline: "Civil marriage celebrant",
    services: [
      "Celebrant",
      "MC"
    ],
    serviceArea: [
      "VIC"
    ],
    languages: [
      "Cantonese",
      "Mandarin",
      "English"
    ],
    lede: "Ceremonies that bring your closest family and friends into the moment.",
    quote: "The wedding ceremony should be centred on the couple and your closest family and friends.",
    story: [
      "The wedding ceremony should be centred on the couple and your closest family and friends. In my ceremonies, I involve these key people in a unique way that takes the definition of personalised service to a new level."
    ],
    contact: {
      website: "https://www.melbournecivilmarriagecelebrant.com.au/"
    },
    socials: {
      instagram: "https://www.instagram.com/monamelbcelebrant/"
    },
    featured: false
  },
  {
    slug: "patrick-nguyen-kieu",
    name: "Patrick Nguyen Kieu",
    legacySlug: "mr",
    discipline: "Wedding photography",
    services: [
      "Photographer"
    ],
    based: "Melbourne",
    serviceArea: [
      "VIC"
    ],
    languages: [
      "Vietnamese",
      "English"
    ],
    lede: "A fashion and portrait photographer bringing an editorial eye to weddings.",
    quote: "Elegant, emotive images that feel timeless yet true to you.",
    story: [
      "Hi, I’m Patrick, a photographer with a strong foundation in fashion and portrait photography, now expanding my creative journey into the world of weddings. With a keen eye for detail and a love for capturing authentic emotion, I bring a fresh and stylish perspective to every love story I document.",
      "My experience in fashion photography has sharpened my sense of aesthetics, composition, and storytelling, while my portrait work has taught me how to connect with people and bring out their natural confidence in front of the camera. These skills have become invaluable as I explore wedding photography, where genuine moments and personal style come together in the most meaningful way.",
      "As I grow in this space, I’m committed to creating elegant, emotive images that feel timeless yet true to you. Whether it’s a candid exchange or a beautifully styled portrait, I approach every frame with creativity, care, and intention.",
      "Let’s make something unforgettable together."
    ],
    signoff: "Patrick",
    contact: {
      email: "hcn.patrick@gmail.com",
      phone: "0450133742",
      website: "https://patricknguyenkieuphoto.myportfolio.com/"
    },
    socials: {
      instagram: "https://www.instagram.com/patricknguyenkieu/"
    },
    featured: false
  },
  {
    slug: "nikki-z-wedding-services",
    name: "Nikki Z Wedding Services",
    discipline: "MC & tea ceremony host",
    services: [
      "MC",
      "Music"
    ],
    based: "Melbourne",
    serviceArea: [
      "VIC"
    ],
    travels: "Travels interstate and internationally",
    languages: [
      "Mandarin"
    ],
    lede: "A bilingual MC who also plans the tea ceremony and door games, with more than ten years on the mic.",
    quote: "Fluent in both Chinese Mandarin and English, I make sure every moment is perfect.",
    story: [
      "I’m thrilled to offer a wide range of wedding services, from hosting receptions to planning the Chinese tea ceremony and door games. Fluent in both Chinese Mandarin and English, I make sure every moment is perfect. With over 10 years of experience in the industry and a passion for performing arts, I love crafting atmospheres that suit any celebration size. You might have seen my work in top venues like Crown Palladium, Stones of the Yarra Valley, Campbell Point House, MCEC, Sydney ICC, and Curzon Hall across Melbourne and Sydney. While I call Melbourne home, I’m excited to serve clients all over Australia and beyond."
    ],
    contact: {
      email: "emcee.nikki@gmail.com",
      website: "https://www.nikkizhao.com.au"
    },
    socials: {
      instagram: "https://www.instagram.com/nikki.zhaooo/",
      facebook: "https://www.facebook.com/emceenikki"
    },
    featured: false
  },
  {
    slug: "right-click-moments",
    name: "Right Click Moments",
    discipline: "Photo & film",
    services: [
      "Photographer",
      "Videographer"
    ],
    serviceArea: [
      "VIC"
    ],
    languages: [
      "Indonesian"
    ],
    lede: "Journalistic photography and film with minimal posing.",
    story: [
      "Capturing the precious moments as they unfold.",
      "Photography and videography with a journalistic point of view and minimal posing."
    ],
    contact: {
      email: "Farhad@rightclickmoments.com"
    },
    socials: {
      instagram: "https://www.instagram.com/rightclick.moments",
      facebook: "https://www.facebook.com/rightclick.moments"
    },
    featured: false
  },
  {
    slug: "rosie-haus",
    name: "Rosie Haus",
    discipline: "Florist",
    services: [
      "Florist"
    ],
    serviceArea: [
      "VIC"
    ],
    languages: [
      "Vietnamese"
    ],
    lede: "Bespoke florals that reflect your love story and your cultural heritage.",
    quote: "Arrangements that reflect their love story and cultural heritage.",
    story: [
      "Here at Rosie Haus, we fully appreciate the imperative role that flowers play on your special day.",
      "Rosie Haus Florist offers bespoke floral design services tailored to meet the unique needs and preferences of each client. With a focus on creativity, attention to detail, and personalised customer service, Rosie Haus Florist brings couples’ wedding visions to life through intricately crafted arrangements that reflect their love story and cultural heritage. From traditional bouquets to contemporary centrepieces, Rosie Haus Florist combines expertise with passion to create memorable floral experiences!"
    ],
    contact: {
      email: "rosiehausflorist@gmail.com",
      website: "https://www.rosiehaus.com"
    },
    socials: {
      instagram: "https://www.instagram.com/rosiehaus/"
    },
    featured: false
  },
  {
    slug: "seventy7-studios-booths",
    name: "Seventy7 Studios & Booths",
    discipline: "Content, photo & 360 booths",
    services: [
      "Content Creator",
      "Photographer",
      "Videographer"
    ],
    serviceArea: [
      "VIC"
    ],
    languages: [
      "Vietnamese"
    ],
    lede: "Photo, video and content, plus traditional and 360 photobooths.",
    quote: "Not just captured, but cherished.",
    story: [
      "Seventy7 Studios started as a creative hub for business content but has recently begun entering the Wedding Event Space. We’re all about capturing those unrepeatable moments and the deep emotions that come with them. Building on that passion, we’ve also launched Seventy7 Booths, where we offer everything from fun traditional photobooths to captivating 360 booths. And we’re not stopping there—we’re gearing up to introduce live portraits soon. Whether it’s a corporate event or a personal celebration, we’re here to make sure every moment is not just captured, but cherished."
    ],
    contact: {
      email: "seventy7booths@gmail.com"
    },
    socials: {
      instagram: "https://www.instagram.com/seventy7booths",
      facebook: "https://www.facebook.com/seventy7studiosau"
    },
    featured: false
  },
  {
    slug: "silver-arrow-films",
    name: "Silver Arrow Films",
    discipline: "Wedding films",
    services: [
      "Videographer"
    ],
    serviceArea: [
      "VIC"
    ],
    languages: [
      "Filipino"
    ],
    lede: "Romantic, candid, unobtrusive films that find the moments you didn’t see.",
    quote: "Capturing poetry in motion.",
    story: [
      "Silver Arrow Films want nothing more than to document your love story with heart. Where we excel is in capturing the little details, the moments you might not otherwise see – all the laughter, tears, pure joy, and heartfelt emotions experienced. Through the lens of our camera, you will have a precious keepsake so you can remember just how magical and picturesque the day was. Our style is romantic and candid, we prefer to be unobtrusive allowing all the moments to play out naturally. No two films are ever the same as our editing and storytelling adapts and molds from what the celebration brings."
    ],
    contact: {
      email: "info@marloncaracena.com",
      website: "https://www.silverarrowfilms.com"
    },
    socials: {
      instagram: "https://www.instagram.com/silverarrowfilms",
      facebook: "https://www.facebook.com/silverarrowfilms"
    },
    featured: false
  },
  {
    slug: "stephanie-nguyen-artistry",
    name: "Stephanie Nguyen Artistry",
    discipline: "Hair & makeup",
    services: [
      "Hair & Makeup"
    ],
    serviceArea: [
      "VIC"
    ],
    languages: [
      "Vietnamese"
    ],
    lede: "Professional hair and makeup for weddings and events.",
    story: [
      "Professional Hair & Makeup Artist specialising in events and weddings"
    ],
    contact: {
      email: "hello@stephanienguyenartistry.com"
    },
    socials: {
      instagram: "https://www.instagram.com/stephanienguyenartistry/"
    },
    featured: false
  },
  {
    slug: "victor-tang-photography",
    name: "Victor Tang Photography",
    discipline: "Documentary photography",
    services: [
      "Photographer"
    ],
    serviceArea: [
      "VIC"
    ],
    languages: [
      "Mandarin"
    ],
    lede: "Documentary-style photography where raw emotion meets creativity.",
    quote: "Where raw emotions meet creativity.",
    story: [
      "Documentary-style wedding photography that focuses on capturing unforgettable moments and raw emotions mixed with creativity."
    ],
    contact: {
      email: "info@victoryangphotography.com.au",
      website: "https://victoryangphotography.com.au/"
    },
    socials: {
      instagram: "https://instagram.com/victoryangphotography",
      facebook: "https://www.facebook.com/victoryangphotography"
    },
    featured: false
  },
  {
    slug: "yaya-films",
    name: "Yaya Films",
    discipline: "Wedding films",
    services: [
      "Photographer",
      "Videographer"
    ],
    serviceArea: [
      "VIC"
    ],
    languages: [
      "Indonesian"
    ],
    lede: "Films full of laughter, happy tears and questionable dance moves: the joyous chaos of weddings.",
    quote: "Your unofficial bridal squad, unlicensed party starter, dad joke provider.",
    story: [
      "We are Yaya Films – your unofficial bridal squad, unlicensed party starter, dad joke provider, and support animal on your wedding day. Our goal is to create wedding videos that are full of snort-induced laughter, mascara-ruining teary sesh and pants-splitting dance moves – the joyous chaos of weddings.",
      "At Yaya Films, we understand that every wedding is different, and we take great pride in our ability to capture the essence of your wedding day in a way that truly reflects your personality and style. We focus on fun couples who want to showcase their love story honestly, fun and heartwarmingly. Whether you are looking for a wedding video that is full of snort-induced laughter, mascara-ruining teary sessions, or pants-splitting dance moves, we are here to help. Our goal is to create wedding videos that capture the joyous chaos of weddings, and we take great pride in helping our couples relive their special day for years to come."
    ],
    contact: {
      email: "hello@yayafilms.com.au",
      website: "https://yayafilms.com.au"
    },
    socials: {
      instagram: "https://www.instagram.com/yaya.films/"
    },
    featured: false
  },
  {
    slug: "yong-video-productions",
    name: "Yong Video Productions",
    discipline: "Cinematic wedding films",
    services: [
      "Photographer",
      "Videographer"
    ],
    serviceArea: [
      "VIC"
    ],
    languages: [
      "Cantonese",
      "Mandarin",
      "Thai",
      "Vietnamese"
    ],
    lede: "Cinematic wedding films from a team that speaks Cantonese, Mandarin, Thai and Vietnamese.",
    quote: "Transforming fleeting moments into timeless memories.",
    story: [
      "We specialise in beautifully capturing the essence of your wedding day, transforming fleeting moments into timeless memories that you’ll cherish for a lifetime. With attention to detail and a passion for storytelling, we craft cinematic wedding films that authentically reflect your love story, ensuring every precious moment is preserved in stunning clarity and emotion."
    ],
    contact: {
      email: "yongvideo@gmail.com",
      website: "https://www.yongvideo.com.au"
    },
    socials: {
      facebook: "https://www.facebook.com/yongvideo/"
    },
    featured: false
  }
]
;
