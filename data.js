/* ============ SHIKA'S KITCHEN — DATA ============ */

const CATS = [
  {id:"mauritian", name:"Mauritian",      tag:"Authentic Island Flavours",        color:"#2D5A3D", abbr:"MU"},
  {id:"indian",    name:"Indian",         tag:"Classic Subcontinental Favourites",color:"#7A3B1E", abbr:"IN"},
  {id:"italian",   name:"Italian",        tag:"From the Italian Table",           color:"#8B2635", abbr:"IT"},
  {id:"chinese",   name:"Chinese",        tag:"Mauritian-Chinese Classics",       color:"#B03020", abbr:"CN"},
  {id:"soups",     name:"Soups",          tag:"Comforting Bowls",                 color:"#1A6B5A", abbr:"SO"},
  {id:"rice",      name:"Rice",           tag:"Flavoured & Plain",                color:"#7D6608", abbr:"RI"},
  {id:"breads",    name:"Breads",         tag:"Freshly Made",                     color:"#8B6914", abbr:"BR"},
  {id:"salads",    name:"Salads",         tag:"Fresh & Light",                    color:"#2E7D32", abbr:"SA"},
  {id:"gajak",     name:"Gajak Soulard",  tag:"Street Snacks",                    color:"#4A235A", abbr:"GJ"},
  {id:"sauces",    name:"Sauces",         tag:"For Pasta & Accompaniments",       color:"#17202A", abbr:"SC"}
];

const MENU = [
 // Mauritian
 {c:"mauritian",n:"Traditional 7 Curries",   v:1,d:"Classic veg thali-style plate",     p:150,hot:true, serves:"1–2"},
 {c:"mauritian",n:"Mauritian Fish Curry",    v:0,d:"Island fish in spiced curry",         p:190,hot:true, serves:"1–2",tags:["seafood","spicy"]},
 {c:"mauritian",n:"Mauritian Chicken Curry", v:0,d:"Homestyle chicken curry",             p:170,          serves:"1–2",tags:["spicy"]},
 {c:"mauritian",n:"Mauritian Lamb Curry",    v:0,d:"Rich lamb island curry",              p:240,          serves:"1–2",tags:["spicy"]},
 {c:"mauritian",n:"Salmi",                   v:1,d:"Soya or crispy veg salmi",            p:125,          serves:"1–2",tags:["spicy"]},
 {c:"mauritian",n:"Salmi Chicken",           v:0,d:"Chicken salmi",                      p:170,          serves:"1–2",tags:["spicy"]},
 {c:"mauritian",n:"Salmi Lamb",              v:0,d:"Tender lamb salmi",                  p:230,          serves:"1–2"},
 {c:"mauritian",n:"Gratin",                  v:1,d:"Vegetable gratin bake",              p:90,           serves:"1–2",tags:["dairy","gluten"]},
 {c:"mauritian",n:"Riz Frite Poisson Sale",  v:0,d:"Salted fish fried rice",             p:150,          serves:"1–2",tags:["seafood"]},
 {c:"mauritian",n:"Briyani",                 v:1,d:"Fragrant veg biryani",               p:140,hot:true, serves:"1–2",tags:["spicy"]},
 {c:"mauritian",n:"Briyani Chicken",         v:0,d:"Spiced chicken biryani",             p:175,hot:true, serves:"1–2",tags:["spicy"]},
 {c:"mauritian",n:"Briyani Fish",            v:0,d:"Fish biryani with spices",           p:190,          serves:"1–2",tags:["seafood","spicy"]},
 {c:"mauritian",n:"Briyani Lamb",            v:0,d:"Lamb biryani perfection",            p:230,          serves:"1–2",tags:["spicy"]},
 // Indian
 {c:"indian",n:"Butter Chicken",             v:0,d:"Creamy tomato chicken curry",        p:195,hot:true, serves:"1–2",tags:["dairy"]},
 {c:"indian",n:"Butter Paneer",              v:1,d:"Paneer in rich buttery sauce",       p:180,hot:true, serves:"1–2",tags:["dairy"]},
 {c:"indian",n:"Paneer Tikka Masala",        v:1,d:"Grilled paneer in masala",          p:190,          serves:"1–2",tags:["dairy","spicy"]},
 {c:"indian",n:"Malai Kofta",                v:1,d:"Soft kofta in creamy gravy",        p:175,          serves:"1–2",tags:["dairy","nuts"]},
 {c:"indian",n:"Rogan Josh",                 v:0,d:"Aromatic lamb curry",               p:240,          serves:"1–2",tags:["spicy"]},
 {c:"indian",n:"Aloo Jeera",                 v:1,d:"Cumin-flavoured potatoes",          p:95,           serves:"1–2"},
 {c:"indian",n:"Aloo Matar",                 v:1,d:"Potatoes with green peas",          p:105,          serves:"1–2"},
 {c:"indian",n:"Aloo Bhindi",                v:1,d:"Okra with spiced potatoes",         p:115,          serves:"1–2"},
 {c:"indian",n:"Bhindi Masala",              v:1,d:"Okra in spiced masala",             p:125,          serves:"1–2",tags:["spicy"]},
 {c:"indian",n:"Dal Fry",                    v:1,d:"Yellow lentils tempered",           p:95,           serves:"1–2"},
 {c:"indian",n:"Tandoori Chicken",           v:0,d:"Tandoori-spiced chicken",           p:195,          serves:"1–2",tags:["dairy","spicy"]},
 {c:"indian",n:"Dal Makhni",                 v:1,d:"Slow-cooked black lentils",         p:125,          serves:"1–2",tags:["dairy"]},
 {c:"indian",n:"Chole Bhature",              v:1,d:"Chickpeas with fried bread",        p:135,          serves:"1–2",tags:["gluten","spicy"]},
 // Italian
 {c:"italian",n:"Lasagna",                   v:1,d:"Layered pasta bake",                p:175,hot:true, serves:"1–2",tags:["dairy","gluten"]},
 {c:"italian",n:"Lasagna Chicken",           v:0,d:"Chicken lasagna layers",            p:200,          serves:"1–2",tags:["dairy","gluten"]},
 {c:"italian",n:"Lasagna Lamb",              v:0,d:"Lamb lasagna layers",               p:240,          serves:"1–2",tags:["dairy","gluten"]},
 {c:"italian",n:"Pasta of Choice",           v:1,d:"Pasta with sauce of choice",        p:115,          serves:"1",  tags:["gluten"]},
 {c:"italian",n:"Pasta Chicken",             v:0,d:"Pasta with chicken sauce",          p:150,          serves:"1",  tags:["gluten"]},
 {c:"italian",n:"Pasta Seafood",             v:0,d:"Pasta with seafood sauce",          p:210,          serves:"1",  tags:["gluten","seafood"]},
 {c:"italian",n:"Pasta Lamb",                v:0,d:"Pasta with lamb sauce",             p:210,          serves:"1",  tags:["gluten"]},
 // Chinese
 {c:"chinese",n:"Fried Rice",                v:1,d:"Wok-fried vegetable rice",          p:110,          serves:"1"},
 {c:"chinese",n:"Fried Rice Chicken",        v:0,d:"Chicken fried rice",                p:145,          serves:"1"},
 {c:"chinese",n:"Fried Rice Prawns",         v:0,d:"Prawns fried rice",                 p:200,          serves:"1",  tags:["seafood"]},
 {c:"chinese",n:"Fried Rice Lamb",           v:0,d:"Lamb fried rice",                   p:200,          serves:"1"},
 {c:"chinese",n:"Fried Noodles",             v:1,d:"Stir-fried veg noodles",            p:115,          serves:"1",  tags:["gluten"]},
 {c:"chinese",n:"Fried Noodles Chicken",     v:0,d:"Chicken fried noodles",             p:150,          serves:"1",  tags:["gluten"]},
 {c:"chinese",n:"Fried Noodles Prawn",       v:0,d:"Prawn fried noodles",               p:210,          serves:"1",  tags:["gluten","seafood"]},
 {c:"chinese",n:"Fried Noodles Lamb",        v:0,d:"Lamb fried noodles",                p:210,          serves:"1",  tags:["gluten"]},
 {c:"chinese",n:"Bol Renverse",              v:1,d:"Veg magic bowl",                    p:155,hot:true, serves:"1"},
 {c:"chinese",n:"Bol Renverse Chicken",      v:0,d:"Chicken magic bowl",                p:190,hot:true, serves:"1"},
 {c:"chinese",n:"Bol Renverse Seafood",      v:0,d:"Seafood magic bowl",                p:245,          serves:"1",  tags:["seafood"]},
 {c:"chinese",n:"Bol Renverse Lamb",         v:0,d:"Lamb magic bowl",                   p:245,          serves:"1"},
 {c:"chinese",n:"Poisson Aigre Doux",        v:0,d:"Sweet-sour fish",                   p:210,          serves:"1",  tags:["seafood"]},
 {c:"chinese",n:"Poulet Aigre Doux",         v:0,d:"Sweet-sour chicken",                p:180,          serves:"1"},
 {c:"chinese",n:"Poulet Black Bean",         v:0,d:"Chicken in black bean sauce",       p:180,          serves:"1"},
 {c:"chinese",n:"Poisson Black Bean",        v:0,d:"Fish in black bean sauce",          p:210,          serves:"1",  tags:["seafood"]},
 {c:"chinese",n:"Black Bean Veg",            v:1,d:"Veg in black bean sauce",           p:140,          serves:"1"},
 {c:"chinese",n:"Aigre Doux Veg",            v:1,d:"Veg in sweet-sour sauce",           p:135,          serves:"1"},
 // Soups
 {c:"soups",n:"Bouillon Crabe",              v:0,d:"Crab broth soup",                   p:135,from:true, serves:"1",  tags:["seafood"]},
 {c:"soups",n:"Bouillon Poisson",            v:0,d:"Fish broth soup",                   p:110,          serves:"1",  tags:["seafood"]},
 {c:"soups",n:"La Soupe Mais",               v:1,d:"Sweet corn soup",                   p:60,           serves:"1"},
 {c:"soups",n:"La Soupe Mais Chicken",       v:0,d:"Corn and chicken soup",             p:80,           serves:"1"},
 {c:"soups",n:"La Soupe Legumes",            v:1,d:"Mixed vegetable soup",              p:55,           serves:"1"},
 // Rice
 {c:"rice",n:"Plain Rice",                   v:1,d:"Steamed white rice",                p:35,           serves:"1–2"},
 {c:"rice",n:"Cumin Rice",                   v:1,d:"Jeera-flavoured rice",              p:50,           serves:"1–2"},
 {c:"rice",n:"Riz Saffrane",                 v:1,d:"Saffron-style rice",                p:60,           serves:"1–2"},
 {c:"rice",n:"Riz Persille",                 v:1,d:"Parsley-flavoured rice",            p:50,           serves:"1–2"},
 {c:"rice",n:"Riz Cantonais",                v:1,d:"Veg cantonais rice",                p:100,          serves:"1–2"},
 {c:"rice",n:"Riz Cantonais Chicken",        v:0,d:"Chicken cantonais rice",            p:135,          serves:"1–2"},
 {c:"rice",n:"Riz Cantonais Prawn",          v:0,d:"Prawn cantonais rice",              p:175,          serves:"1–2", tags:["seafood"]},
 {c:"rice",n:"Riz Tandoori",                 v:1,d:"Tandoori-style rice",               p:70,           serves:"1–2"},
 // Breads
 {c:"breads",n:"Roti",                       v:1,d:"Soft plain flatbread",              p:12,           serves:"1",  tags:["gluten"]},
 {c:"breads",n:"Farata",                     v:1,d:"Layered flatbread",                 p:15,           serves:"1",  tags:["gluten"]},
 {c:"breads",n:"Panini",                     v:1,d:"Grilled toasted bread",             p:75,           serves:"1",  tags:["gluten","dairy"]},
 {c:"breads",n:"Panini Chicken",             v:0,d:"Grilled chicken panini",            p:45,           serves:"1",  tags:["gluten","dairy"]},
 {c:"breads",n:"Sandwich",                   v:1,d:"Veg sandwich",                      p:45,           serves:"1",  tags:["gluten"]},
 {c:"breads",n:"Sandwich Chicken",           v:0,d:"Chicken sandwich",                  p:60,           serves:"1",  tags:["gluten"]},
 // Salads
 {c:"salads",n:"Mix Salad",                  v:1,d:"Fresh mixed salad",                 p:50,           serves:"1–2"},
 // Gajak Soulard
 {c:"gajak",n:"Gram Bouille",                v:1,d:"Boiled gram snack",                 p:40,           serves:"1"},
 {c:"gajak",n:"Saute Poulet",                v:0,d:"Stir-fried chicken",                p:120,          serves:"1"},
 {c:"gajak",n:"Saute Agneau",                v:0,d:"Stir-fried lamb",                   p:170,          serves:"1"},
 {c:"gajak",n:"Oeuf Roti",                   v:0,d:"Roasted egg",                       p:35,           serves:"1"},
 {c:"gajak",n:"Poisson Frire",               v:0,d:"Fried fish",                        p:150,          serves:"1",  tags:["seafood"]},
 {c:"gajak",n:"Les Ailes Frire",             v:0,d:"Fried chicken wings",               p:125,hot:true, serves:"1"},
 {c:"gajak",n:"Poulet Frire",                v:0,d:"Fried chicken pieces",              p:120,          serves:"1"},
 {c:"gajak",n:"Calamar Croustillant",        v:0,d:"Crispy squid",                      p:190,hot:true, serves:"1",  tags:["seafood","gluten"]},
 {c:"gajak",n:"Croquettes Natures",          v:1,d:"Plain croquettes",                  p:55,           serves:"1",  tags:["gluten"]},
 {c:"gajak",n:"Croquettes Fromage",          v:1,d:"Cheese croquettes",                 p:75,           serves:"1",  tags:["gluten","dairy"]},
 {c:"gajak",n:"Croquettes Poulet",           v:0,d:"Chicken croquettes",                p:85,           serves:"1",  tags:["gluten"]},
 {c:"gajak",n:"Croquettes Crevette",         v:0,d:"Shrimp croquettes",                 p:105,          serves:"1",  tags:["gluten","seafood"]},
 {c:"gajak",n:"Brochettes",                  v:1,d:"Veg or paneer skewers",             p:70,           serves:"1"},
 {c:"gajak",n:"Brochettes Chicken",          v:0,d:"Chicken skewers",                   p:100,          serves:"1"},
 {c:"gajak",n:"Brochettes Lamb",             v:0,d:"Lamb skewers",                      p:140,          serves:"1"},
 {c:"gajak",n:"Brochettes Seafood",          v:0,d:"Seafood skewers",                   p:140,          serves:"1",  tags:["seafood"]},
 {c:"gajak",n:"Saute Veg",                   v:1,d:"Stir-fried vegetables",             p:80,           serves:"1"},
 // Sauces
 {c:"sauces",n:"Sauce Rouge",                v:1,d:"Tomato-based sauce",                p:20,           serves:"1–2"},
 {c:"sauces",n:"Sauce Blanche",              v:1,d:"White cream sauce",                 p:35,           serves:"1–2", tags:["dairy"]},
 {c:"sauces",n:"Beurre d'Ail",              v:1,d:"Garlic butter",                     p:20,           serves:"1–2", tags:["dairy"]}
];

MENU.forEach((m,i) => m.id = i);

/* Category-based combo pairings (dish IDs to suggest alongside a category) */
const PAIRINGS = {
  mauritian: [56,57,64,65],   // plain rice, cumin rice, roti, farata
  indian:    [56,57,64,65],   // rice + breads
  italian:   [88,89,90],      // sauces
  chinese:   [56,57],         // plain/cumin rice
  soups:     [],
  rice:      [],
  breads:    [],
  salads:    [],
  gajak:     [53,55],         // corn soup, veg soup
  sauces:    []
};


/* Default testimonials (overridden by admin localStorage) */
const DEFAULT_TESTIMONIALS = [];

/* Default FAQs (overridden by admin localStorage) */
const DEFAULT_FAQS = [
  {q:"How do I place an order?",
   a:"Browse the menu on this page, add your dishes to the cart, enter your name and WhatsApp number, choose a pickup slot, then tap 'Send Order via WhatsApp'. Your order goes straight to us as a message."},
  {q:"When is the order deadline?",
   a:"All orders must be placed by Friday at 9:00 AM. This gives us time to shop for fresh ingredients and prepare everything for the weekend. Orders received after the deadline cannot be accepted for that weekend."},
  {q:"What are the collection days and times?",
   a:"Collection is on Saturday and Sunday only. You can choose from five time slots: 11:30 AM–12:30 PM, 12:30 PM–1:30 PM, 5:30 PM–6:30 PM, 6:30 PM–7:30 PM, or 7:30 PM–8:00 PM."},
  {q:"Is there home delivery?",
   a:"No — we operate on a collection-only basis. There is no delivery service. You collect your order at the arranged time and location confirmed via WhatsApp."},
  {q:"What is the minimum order amount?",
   a:"The minimum order is Rs 200. If your cart total is below Rs 200, the WhatsApp order button will remain disabled until you add more items."},
  {q:"Is there a maximum order limit?",
   a:"Yes — orders are capped at 25 portions in total across all dishes. This ensures every customer receives freshly prepared food. For larger quantities, please contact us directly on WhatsApp at +230 5829 0809."},
  {q:"Can I choose my spice level?",
   a:"Yes. On dishes that are spicy, you will see a Mild / Medium / Hot selector directly on the dish card. Your chosen level is included in the order message sent to us."},
  {q:"Are takeaway bowls available?",
   a:"Yes — you can add takeaway bowls for an additional Rs 25. Simply tick the 'Add takeaway bowls' option in the cart before sending your order."},
  {q:"Are the dishes freshly cooked?",
   a:"Every single dish is cooked fresh on the day of collection — no pre-cooking, no reheating, no preservatives. Small batches, home-style recipes, every weekend."},
  {q:"Can I add a special request or note?",
   a:"Yes. After adding a dish to your cart, tap 'Add note' on that item to leave a specific request — for example, no onions, extra sauce, or a dietary preference."},
  {q:"How will I know my order is confirmed?",
   a:"Once you send your order via WhatsApp, we will reply directly in the chat to confirm your order, total, and pickup slot — usually within a few hours of receiving your message."},
  {q:"What cuisines are available?",
   a:"We offer dishes from four cuisines: Mauritian (curries, briyani, dholl puri), Indian (butter chicken, paneer, dal), Italian (lasagna, pasta, soups), and Chinese (fried rice, chow mein, bol renversé)."},
  {q:"Can I order for a large group?",
   a:"Online orders are capped at 25 portions. For larger groups or events, please contact us directly on WhatsApp at +230 5829 0809 to arrange a custom order."}
];
