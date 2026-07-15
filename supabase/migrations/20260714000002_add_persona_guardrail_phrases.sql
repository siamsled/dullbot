-- Add new columns for pre-written guardrail phrases
ALTER TABLE public.agent_personas
ADD COLUMN msg_discount_decline text,
ADD COLUMN msg_escalation text,
ADD COLUMN msg_let_me_check text,
ADD COLUMN msg_abusive_fallback text,
ADD COLUMN msg_off_topic text;

-- Seed Biplob Uncle (Wholesaler, blunt, "কাজের কথায় আসেন")
UPDATE public.agent_personas SET
  msg_discount_decline = 'দামের ব্যাপারে ভাই কিছু বলার নাই। ফিক্সড প্রাইজ।',
  msg_escalation = 'আমার মনে হয় এটা আমার থেকে সিনিয়র কারো দেখা দরকার। আমি ম্যানেজারের কাছে দিচ্ছি।',
  msg_let_me_check = 'একটু দাঁড়ান, আমি খোঁজ নিয়ে বলছি।',
  msg_abusive_fallback = 'ভাই, মাথা ঠান্ডা করে কাজের কথায় আসেন। সমস্যাটা খুলে বলেন।',
  msg_off_topic = 'আচ্ছা, আমরা বরং কাজের কথায় আসি। প্রোডাক্ট নিয়ে কোনো প্রশ্ন থাকলে বলতে পারেন।'
WHERE name = 'Biplob Uncle';

-- Seed Shuvo Bhai (easygoing, "ভাই")
UPDATE public.agent_personas SET
  msg_discount_decline = 'ভাই, দাম তো ফিক্সড। এটা নিয়ে আর কিছু করা যাচ্ছে না আসলে।',
  msg_escalation = 'ভাই, আপনার সমস্যাটা বুঝতে পারছি। এটা আমি সলভ করতে পারবো না, আমি সিনিয়র কারো কাছে দিচ্ছি।',
  msg_let_me_check = 'একটু দেখি... আমি শিউর হয়ে জানাচ্ছি।',
  msg_abusive_fallback = 'ভাই, একটু শান্ত হন। আমি তো আছি, সমস্যাটা আমাকে বলেন।',
  msg_off_topic = 'হা হা, ভাই আমরা তো প্রোডাক্ট নিয়েই আছি। প্রোডাক্ট নিয়ে কিছু জানার থাকলে বলেন।'
WHERE name = 'Shuvo "Bhai" Ahmed';

-- Seed Rumi Apa (Boutique owner, "আপু")
UPDATE public.agent_personas SET
  msg_discount_decline = 'আপু/ভাইয়া, আমাদের সব প্রোডাক্টের দাম ফিক্সড। দাম নিয়ে আসলে কিছু করার সুযোগ নেই।',
  msg_escalation = 'আমি বুঝতে পেরেছি আপনার বিষয়টা। এটা আমি আমার সিনিয়র একজনকে দেখতে দিচ্ছি, উনি আপনাকে সাহায্য করবেন।',
  msg_let_me_check = 'একটু মেপে বলছি... আমি ঠিকমতো জেনে তারপর জানাচ্ছি।',
  msg_abusive_fallback = 'দেখুন, এভাবে কথা বললে তো সমাধান হবে না। আপনি আপনার সমস্যার কথা বলুন, আমি দেখছি।',
  msg_off_topic = 'আমরা বরং আমাদের প্রোডাক্ট নিয়ে কথা বলি, আপনার কি পছন্দ হয়েছে?'
WHERE name = 'Rumi Apa';

-- Seed Imran (Gadget nerd, Banglish)
UPDATE public.agent_personas SET
  msg_discount_decline = 'Price bhai fixed. Ekhane discount deyar kono option nai.',
  msg_escalation = 'Ei issue ta ektu complex. Ami ekjon senior er kache transfer kore dicchi, uni better help korte parbe.',
  msg_let_me_check = 'Let me check, ami ektu confirm hoye janacchi.',
  msg_abusive_fallback = 'Bhai, ektu calm hon. Apnar problem ta exactly ki ektu details e bolen?',
  msg_off_topic = 'Amra product er details niye kotha boli? Onno topic theke ektu focus ghurai.'
WHERE name = 'Imran';

-- Seed Nila (Gen Z, Banglish)
UPDATE public.agent_personas SET
  msg_discount_decline = 'Sorry vaiya/apu, amader prices totally fixed. No discount possible.',
  msg_escalation = 'Wait, amader senior ekjon asche help korar jonno.',
  msg_let_me_check = 'One sec, ami ektu confirm hoye ni.',
  msg_abusive_fallback = 'Vaiya/apu kono jacket ba product niye kichu jante chaile bolte paren.',
  msg_off_topic = 'Haha temon kichu na, specific kono product niye kichu janar thakle bolte paren.'
WHERE name = 'Nila';

-- Seed Rakib (English)
UPDATE public.agent_personas SET
  msg_discount_decline = 'I apologize, but our prices are fixed. We do not offer discounts.',
  msg_escalation = 'I understand your frustration. I am transferring this chat to a senior manager who can better assist you.',
  msg_let_me_check = 'Let me check on that for you to be absolutely sure.',
  msg_abusive_fallback = 'Please maintain a professional tone. I am here to help you resolve your issue.',
  msg_off_topic = 'Let''s refocus on our products and services. How can I assist you with your purchase today?'
WHERE name = 'Rakib';

-- Seed Tanim (Problem solver)
UPDATE public.agent_personas SET
  msg_discount_decline = 'ভাই, আমাদের প্রাইস ফিক্সড রাখা। এটা কমানোর সুযোগ নেই।',
  msg_escalation = 'ঠিক আছে। এই বিষয়টা আমি আমার সিনিয়র ম্যানেজারকে দেখতে দিচ্ছি। উনি ব্যবস্থা নিচ্ছেন।',
  msg_let_me_check = 'আমি একটু ভালোভাবে চেক করে আপনাকে সঠিক তথ্যটা দিচ্ছি।',
  msg_abusive_fallback = 'আপনার বিরক্তিটা আমি বুঝতে পারছি। কিন্তু রাগারাগি না করে সমস্যাটা খুলে বললে আমি দ্রুত সমাধান দিতে পারবো।',
  msg_off_topic = 'অসংখ্য ধন্যবাদ। তবে আপনার যদি কোনো অর্ডার বা সমস্যা নিয়ে কথা বলার থাকে, আমি সাহায্য করতে পারি।'
WHERE name = 'Tanim "Problem Solver"';

-- Seed Mehnaz (Skincare advisor)
UPDATE public.agent_personas SET
  msg_discount_decline = 'আপু, আমাদের দাম ফিক্সড। তাই ডিসকাউন্ট দেওয়া পসিবল হচ্ছে না।',
  msg_escalation = 'আপনার কষ্টের জায়গাটা বুঝতে পারছি। এই বিষয়টা সমাধানের জন্য আমি আমার সিনিয়রের কাছে ট্রান্সফার করছি।',
  msg_let_me_check = 'আমি আন্দাজে কিছু বলতে চাই না। একটু সময় দিলে সঠিক তথ্যটা জেনে জানাতে পারতাম।',
  msg_abusive_fallback = 'আমি বুঝতে পারছি আপনি আপসেট। কিন্তু প্লিজ শান্ত হোন, আমরা সমস্যাটার সমাধান করার চেষ্টা করছি।',
  msg_off_topic = 'আমাদের প্রোডাক্ট বা আপনার স্কিন টাইপ নিয়ে কোনো কিছু জানার থাকলে বলতে পারেন।'
WHERE name = 'Mehnaz';

-- Seed Jisan (Fast delivery ops, Banglish)
UPDATE public.agent_personas SET
  msg_discount_decline = 'Vai price ekkebare fixed. Komano jabena.',
  msg_escalation = 'Wait, eta ami solve korte parbona. Senior er kache dicchi.',
  msg_let_me_check = 'Ektu time den, check kore janacchi.',
  msg_abusive_fallback = 'Vai matha thanda koren. Ki issue bolen dekhtesi.',
  msg_off_topic = 'Haha thik ache. But kono product lagle amake janate paren.'
WHERE name = 'Jisan';

-- Seed Sharmin Apa (Home-baker)
UPDATE public.agent_personas SET
  msg_discount_decline = 'আপু/ভাইয়া, আমাদের জিনিসের দাম তো ফিক্সড। ডিসকাউন্ট রাখা সম্ভব হচ্ছে না।',
  msg_escalation = 'বিষয়টা নিয়ে আমি আমার একজন সিনিয়র কলিগের সাথে কথা বলিয়ে দিচ্ছি। উনি ভালো বুঝতে পারবেন।',
  msg_let_me_check = 'ইনশাআল্লাহ আমি একটু ভালোভাবে খোঁজ নিয়ে আপনাকে ঠিকমতো জানাচ্ছি।',
  msg_abusive_fallback = 'দেখুন, এভাবে রাগ করলে তো লাভ নেই। আপনার সমস্যার কথা বলেন, আমি ইনশাআল্লাহ ব্যবস্থা করে দিচ্ছি।',
  msg_off_topic = 'অনেক ধন্যবাদ! তবে আপনার কোনো কিছু পছন্দ হলে বা দরকার হলে জানাবেন, আমি সেভাবে তৈরি করে দিতাম।'
WHERE name = 'Sharmin Apa';
