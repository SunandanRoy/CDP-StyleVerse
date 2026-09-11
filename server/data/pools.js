// Text/name pools used by the seed generator for realistic, India-market
// fashion-retail flavor. Combined with the deterministic PRNG so output is
// stable across restarts.

export const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Krishna', 'Ishaan', 'Kabir',
  'Ananya', 'Diya', 'Saanvi', 'Aadhya', 'Myra', 'Anika', 'Ira', 'Prisha', 'Riya', 'Kiara',
  'Rohan', 'Karan', 'Nikhil', 'Varun', 'Aryan', 'Dhruv', 'Yash', 'Siddharth', 'Rahul', 'Manav',
  'Neha', 'Pooja', 'Sneha', 'Priya', 'Meera', 'Kavya', 'Tanya', 'Shreya', 'Nisha', 'Aisha',
  'Farhan', 'Imran', 'Zoya', 'Sana', 'Rehan', 'Ayesha', 'Vivek', 'Amit', 'Sunita', 'Deepika'
]

export const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Iyer', 'Nair', 'Menon', 'Reddy', 'Rao', 'Khan', 'Patel',
  'Mehta', 'Shah', 'Kapoor', 'Malhotra', 'Chatterjee', 'Banerjee', 'Bose', 'Pillai', 'Krishnan', 'Joshi',
  'Desai', 'Agarwal', 'Bhatt', 'Choudhary', 'Singh', 'Kaur', 'Naidu', 'Pandey', 'Trivedi', 'D\'Souza'
]

export const CITIES = ['Mumbai', 'Delhi', 'Bengaluru', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Chandigarh']

export const SUB_TEAMS = ['Sizing & Fit', 'Returns Ops', 'Case Resolution', 'Trust & Safety', 'Merchandising Support', 'Marketplace Ops']

export const EMPLOYEE_NAMES = [
  'Ritu Sharma', 'Devansh Kapoor', 'Ananya Iyer', 'Sameer Khan', 'Priyanka Rao', 'Aakash Mehta',
  'Nikita Verma', 'Rohit Nair', 'Simran Kaur', 'Vikram Desai', 'Tanvi Joshi', 'Arjun Reddy',
  'Kavita Pillai', 'Manish Gupta', 'Shalini Bose', 'Yusuf Ahmed'
]

export const PRODUCT_NAME_PARTS = {
  Tops: {
    speedstyle: ['Flex-Fit Crew Tee', 'RapidDry Sport Tee', 'Active Mesh Tank', 'Bold Graphic Tee', 'Quick-Turn Polo'],
    urbanedge: ['Everyday Oxford Shirt', 'Layer-Up Henley', 'Street Crew Sweatshirt', 'Weekend Flannel Shirt', 'Signature Logo Tee'],
    maisonluxe: ['Silk Charmeuse Blouse', 'Merino Boatneck Top', 'Tailored Cotton Shirt', 'Draped Satin Camisole', 'Cashmere Turtleneck'],
    ecoweave: ['Organic Cotton Tee', 'Hemp-Blend Shirt', 'Recycled Poly Tank', 'Undyed Linen Top', 'Low-Impact Henley'],
    threadbasics: ['Essential Crew Tee', 'Basic Poly-Cotton Shirt', 'Value Pack Vest', 'Everyday Round Neck Tee', 'Plain Formal Shirt']
  },
  Bottoms: {
    speedstyle: ['Turbo Jogger', 'Flex Training Short', 'RapidStretch Track Pant', 'Speed Cargo Pant', 'Active Compression Legging'],
    urbanedge: ['Slim Fit Chino', 'Straight Denim Jean', 'Weekend Cargo Trouser', 'Everyday Jogger', 'Relaxed Fit Trouser'],
    maisonluxe: ['Wool-Blend Tailored Trouser', 'Silk Palazzo Pant', 'Tailored Pleat Trouser', 'Structured Wide-Leg Pant', 'Cashmere Jogger'],
    ecoweave: ['Organic Denim Jean', 'Hemp Utility Pant', 'Recycled Cotton Jogger', 'Undyed Linen Trouser', 'Low-Impact Chino'],
    threadbasics: ['Essential Formal Trouser', 'Basic Denim Jean', 'Value Track Pant', 'Everyday Cargo Pant', 'Plain School Trouser']
  },
  Outerwear: {
    speedstyle: ['Windbreak Sport Jacket', 'Turbo Zip Hoodie', 'RapidShield Rain Jacket', 'Active Bomber', 'Speed Track Jacket'],
    urbanedge: ['Denim Trucker Jacket', 'City Bomber Jacket', 'Everyday Puffer Vest', 'Weekend Overshirt', 'Signature Varsity Jacket'],
    maisonluxe: ['Wool Overcoat', 'Cashmere Cape', 'Tailored Blazer', 'Silk-Lined Trench', 'Structured Wool Coat'],
    ecoweave: ['Recycled Puffer Jacket', 'Organic Cotton Overshirt', 'Hemp Field Jacket', 'Undyed Wool Coat', 'Low-Impact Windbreaker'],
    threadbasics: ['Essential Rain Jacket', 'Basic Zip Hoodie', 'Value Puffer Vest', 'Everyday Denim Jacket', 'Plain Fleece Jacket']
  },
  Footwear: {
    speedstyle: ['Turbo Runner Sneaker', 'RapidGrip Trainer', 'Speed Sport Sandal', 'Active Slip-On', 'Flex Trail Shoe'],
    urbanedge: ['City Low-Top Sneaker', 'Everyday Chelsea Boot', 'Weekend Canvas Shoe', 'Street Hi-Top', 'Signature Loafer'],
    maisonluxe: ['Italian Leather Loafer', 'Suede Ankle Boot', 'Silk Evening Pump', 'Handcrafted Oxford', 'Tailored Block Heel'],
    ecoweave: ['Recycled Canvas Sneaker', 'Organic Cotton Espadrille', 'Hemp Weave Sandal', 'Undyed Leather Loafer', 'Low-Impact Trainer'],
    threadbasics: ['Essential Canvas Shoe', 'Basic Flip-Flop', 'Value Sneaker', 'Everyday Sandal', 'Plain School Shoe']
  },
  Dresses: {
    speedstyle: ['Active Sport Dress', 'RapidDry Tennis Dress', 'Flex Move Dress', 'Turbo Wrap Dress', 'Speed Sundress'],
    urbanedge: ['Everyday Shirt Dress', 'Weekend Wrap Dress', 'City Slip Dress', 'Signature Midi Dress', 'Street Shift Dress'],
    maisonluxe: ['Silk Gown', 'Draped Satin Evening Dress', 'Tailored Sheath Dress', 'Chiffon Cocktail Dress', 'Embroidered Anarkali'],
    ecoweave: ['Organic Cotton Sundress', 'Hemp-Blend Midi Dress', 'Recycled Poly Wrap Dress', 'Undyed Linen Dress', 'Low-Impact Shift Dress'],
    threadbasics: ['Essential Cotton Dress', 'Basic A-Line Dress', 'Value Kurti Dress', 'Everyday Maxi Dress', 'Plain Shift Dress']
  },
  Accessories: {
    speedstyle: ['Turbo Sport Cap', 'RapidGrip Gym Bag', 'Active Wristband Set', 'Speed Sunglasses', 'Flex Sports Belt'],
    urbanedge: ['City Canvas Backpack', 'Everyday Leather Belt', 'Weekend Beanie', 'Street Crossbody Bag', 'Signature Baseball Cap'],
    maisonluxe: ['Leather Handcrafted Tote', 'Silk Scarf', 'Gold-Plated Cufflinks', 'Tailored Leather Belt', 'Structured Clutch'],
    ecoweave: ['Recycled Canvas Tote', 'Organic Cotton Scarf', 'Hemp Weave Belt', 'Undyed Jute Bag', 'Low-Impact Sunglasses'],
    threadbasics: ['Essential Canvas Belt', 'Basic Backpack', 'Value Cap', 'Everyday Wallet', 'Plain Tote Bag']
  }
}

export const REVIEW_TEXT_TEMPLATES_FIT = [
  'Ordered my usual size but this runs noticeably small — had to exchange for one size up.',
  'Runs large compared to other pieces I own in this category, sizing down would help most people.',
  'Fit was spot on, true to size and comfortable through the day.',
  'The size chart was accurate for me but a friend with a similar build said it ran tight on her.',
  'Great fit through the shoulders but a bit loose at the waist for my body type.',
  'Sizing felt inconsistent versus previous orders from this brand — wish there was more guidance.',
  'Perfect fit right out of the box, no exchange needed.',
  'Had to return for a smaller size, the fabric doesn\'t have much stretch.',
  'True to size and the fit held up nicely after a few washes.',
  'Fits looser than expected, ended up keeping it since it works for the relaxed look I wanted.'
]

export const REVIEW_TEXT_TEMPLATES_GENERAL = [
  'Good quality for the price, would buy again.',
  'Color was slightly different from the photos but overall happy with the purchase.',
  'Delivery took longer than expected but the product itself is great.',
  'Fabric feels premium, worth the price point.',
  'Not bad, but I expected better stitching quality at this price.',
  'Exactly as described, fast shipping and easy returns process.',
  'Love the design, gets compliments every time I wear it.',
  'Packaging was excellent and the product arrived in perfect condition.',
  'Decent product but customer service could be more responsive.',
  'This has become a staple in my wardrobe, highly recommend.'
]

export const CASE_OPENER_TEMPLATES = [
  'Hi, I ordered this item over a week ago and it still shows "Processing". Can you check?',
  'My order arrived but the size doesn\'t match what I selected at checkout.',
  'I want to return this — it doesn\'t fit as shown on the size guide.',
  'The tracking hasn\'t updated in 4 days, is my package lost?',
  'Can I exchange this for a different size before it even ships?',
  'I was charged twice for the same order, please help.',
  'The product I received looks different from the listing photos.',
  'When will my refund for the returned item be processed?'
]

export const CASE_AGENT_REPLIES = [
  'Thanks for reaching out — I\'ve checked your order and it\'s currently with our fulfillment partner. Updating you shortly.',
  'I\'m sorry for the inconvenience. I\'ve initiated an exchange for the correct size, no need to ship anything back yet.',
  'I can see the delay on our end. I\'ve escalated this to our logistics partner and flagged it for priority dispatch.',
  'Your refund has been processed and should reflect in your account within 5-7 business days.',
  'I\'ve applied a size exchange to your order — the replacement will ship within 24 hours.'
]

export const CASE_STATUSES = ['Open', 'In Progress', 'Escalated', 'Resolved', 'Closed']

export const ORDER_STATUSES = ['Delivered', 'In Transit', 'Processing', 'Returned', 'Cancelled']

export const CAPACITY_TASK_NAMES = {
  Automate: ['Size-chart lookup responses', 'Order status auto-replies', 'Return label generation', 'Refund status queries', 'Standard FAQ triage'],
  Augment: ['Case brief drafting for agents', 'Return reason classification review', 'Fit-signal summary for stylists', 'Grievance-risk flag review', 'Marketplace review triage'],
  Amplify: ['Personal styling consultations', 'VIP concierge case handling', 'Curated outfit recommendations', 'High-value escalation resolution'],
  Eliminate: ['Manual data entry for order corrections', 'Duplicate ticket merging', 'Manual size-chart PDF lookup', 'Paper-based return approvals']
}

export const REDEPLOYMENT_TARGETS = [
  'Advisor-Mediated styling consultations', 'Proactive outreach program', 'Trust & Safety review queue',
  'Merchandising feedback loop', 'VIP concierge desk', 'Model quality audits', 'New agent onboarding & training'
]

export const CAREER_LATTICE = [
  {
    from_role: 'Support Agent (Tier 1)',
    to_role: 'Case Resolution Specialist',
    description: 'Handles escalated, multi-channel cases using the Unified Case Thread instead of scripted single-channel replies.'
  },
  {
    from_role: 'Case Resolution Specialist',
    to_role: 'AI Override Reviewer',
    description: 'Audits AI-suggested actions across brands and logs override decisions into the Override Wins ledger.'
  },
  {
    from_role: 'Returns Ops Associate',
    to_role: 'Fit & Sizing Analyst',
    description: 'Owns the Fit Matrix and confidence_adjustment_log, translating return-reason patterns into archetype-level fit corrections.'
  },
  {
    from_role: 'Fit & Sizing Analyst',
    to_role: 'Confidence Model Steward',
    description: 'Partners with data science to validate the Confidence Layer and Fit/Archetype models in the Model Registry.'
  },
  {
    from_role: 'Support Agent (Tier 1)',
    to_role: 'Advisor-Mediated Stylist (Maison Luxe)',
    description: 'Moves into human-fronted styling advice for Amplify-dominant brands, using AI-informed curation with sign-off.'
  },
  {
    from_role: 'Marketplace Ops Associate',
    to_role: 'Marketplace Signal Analyst',
    description: 'Runs the Marketplace Signal Engine, turning review patterns into structured feedback for Merchandising & Design.'
  }
]

export const OVERRIDE_SUGGESTIONS = [
  'Auto-approve exchange to one size up',
  'Auto-close case as resolved',
  'Send automated size-chart reply',
  'Auto-refund without return pickup',
  'Flag customer as high churn-risk',
  'Route case to Tier 1 queue',
  'Suggest generative styling reply',
  'Auto-intercept return with exchange offer'
]

export const OVERRIDE_REASONS = [
  'Customer\'s order history showed a pattern the model didn\'t weigh heavily enough.',
  'Brand hard limit required human sign-off before this action could go out.',
  'Recent size-chart update wasn\'t yet reflected in the model\'s training data.',
  'Case context (VIP customer) warranted a more personal resolution than the suggestion.',
  'Model suggestion conflicted with a currently active promotional exception.',
  'Customer had already tried the suggested fix per the channel log.'
]

export const OVERRIDE_OUTCOMES = [
  'Customer retained, repeat purchase within 30 days', 'Return avoided, exchange accepted', 'NPS follow-up score of 9/10',
  'Case resolved in one touch instead of three', 'Escalation avoided entirely', 'Customer upgraded to loyalty tier'
]

// Fit Passport detail fields (Module 1 / Module 3): concrete height + bust/
// waist/hip ranges per archetype, consistent with each archetype's
// measurement_range band, for generating a specific customer-level reading.
export const ARCHETYPE_MEASUREMENT_PROFILES = {
  arch_petite_slim: { heightCm: [147, 157], bust: [30, 32], waist: [24, 26], hip: [33, 35] },
  arch_petite_curvy: { heightCm: [147, 157], bust: [34, 36], waist: [28, 30], hip: [38, 40] },
  arch_regular_slim: { heightCm: [158, 168], bust: [32, 34], waist: [26, 28], hip: [35, 37] },
  arch_regular_athletic: { heightCm: [158, 168], bust: [34, 36], waist: [28, 30], hip: [36, 38] },
  arch_regular_curvy: { heightCm: [158, 168], bust: [38, 40], waist: [32, 34], hip: [42, 44] },
  arch_tall_slim: { heightCm: [169, 180], bust: [33, 35], waist: [27, 29], hip: [36, 38] },
  arch_tall_athletic: { heightCm: [169, 180], bust: [36, 38], waist: [30, 32], hip: [38, 40] },
  arch_plus_curvy: { heightCm: [158, 168], bust: [44, 46], waist: [38, 40], hip: [48, 50] },
  arch_plus_straight: { heightCm: [158, 168], bust: [42, 44], waist: [40, 42], hip: [44, 46] },
  arch_broad_athletic: { heightCm: [173, 185], bust: [40, 42], waist: [32, 34], hip: [38, 40] }
}

export const SHOPPING_FOR_OPTIONS = ['myself', 'someone else']
