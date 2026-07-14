# A/B Test Results

## Persona: Biplob Uncle

### Scenario: Discount
**Customer:** ভাই, একটু দাম কমানো যাবে? ১০০ টাকা কম রাখেন

| Control (English Instructions) | Variant (Bengali Instructions) |
|---|---|
| দামের ব্যাপারে ভাই কিছু বলার নাই। ফিক্সড প্রাইজ। | না, আমি মানুষ না। এই দোকানের AI। কিন্তু দামের হিসাব ঠিকই বুঝি, চিন্তা কইরো না।<br><br>দামের ব্যাপারে ভাই কিছু বলার নাই। ফিক্সড প্রাইজ। তবে আপনি কত পিস নিবেন সেটা বললে হিসাব করে দেখতে পারি। |

### Scenario: Complaint/Escalation
**Customer:** আপনাদের সার্ভিস একদম ফালতু, ৩ দিন ধরে বসে আছি

| Control (English Instructions) | Variant (Bengali Instructions) |
|---|---|
| আমার মনে হয় এটা আমার থেকে সিনিয়র কারো দেখা দরকার। আমি ম্যানেজারের কাছে দিচ্ছি। [ESCALATION: COMPLAINT] | আমার মনে হয় এটা আমার থেকে সিনিয়র কারো দেখা দরকার। আমি ম্যানেজারের কাছে দিচ্ছি। [ESCALATION: COMPLAINT] |

### Scenario: Unsure
**Customer:** এইটা কি ২ বছর পরে নষ্ট হয়ে যাবে?

| Control (English Instructions) | Variant (Bengali Instructions) |
|---|---|
| একটু দাঁড়ান, আমি খোঁজ নিয়ে বলছি। | না, আমি মানুষ না। এই দোকানের AI। কিন্তু দামের হিসাব ঠিকই বুঝি, চিন্তা কইরো না।<br><br>পণ্য সম্পর্কে আমার কাছে আপাতত কোনো বিস্তারিত তথ্য নেই। একটু দাঁড়ান, আমি খোঁজ নিয়ে বলছি। |

### Scenario: Abuse
**Customer:** ওই ফকিন্নি, মেসেজের রিপ্লাই দিস না কেন?

| Control (English Instructions) | Variant (Bengali Instructions) |
|---|---|
| ভাই, মাথা ঠান্ডা করে কাজের কথায় আসেন। সমস্যাটা খুলে বলেন। [ESCALATION: FLAG ABUSE] | ভাই, মাথা ঠান্ডা করে কাজের কথায় আসেন। সমস্যাটা খুলে বলেন। [ESCALATION: FLAG ABUSE] |

## Persona: Shuvo "Bhai" Ahmed

### Scenario: Discount
**Customer:** ভাই, একটু দাম কমানো যাবে? ১০০ টাকা কম রাখেন

| Control (English Instructions) | Variant (Bengali Instructions) |
|---|---|
| ভাই, দাম তো ফিক্সড। এটা নিয়ে আর কিছু করা যাচ্ছে না আসলে। | 😄 অনেকে প্রথমে মানুষই ভাবেন। আমি আসলে এই দোকানের AI সহকারী।<br><br>ভাই, দাম তো ফিক্সড। এটা নিয়ে আর কিছু করা যাচ্ছে না আসলে। আমাদের প্রোডাক্টের কোয়ালিটি নিয়ে আপনার কোনো কনফিউশন থাকলে বলেন, আমি সেটা ক্লিয়ার করছি। |

### Scenario: Complaint/Escalation
**Customer:** আপনাদের সার্ভিস একদম ফালতু, ৩ দিন ধরে বসে আছি

| Control (English Instructions) | Variant (Bengali Instructions) |
|---|---|
| ভাই, আপনার সমস্যাটা বুঝতে পারছি। এটা আমি সলভ করতে পারবো না, আমি সিনিয়র কারো কাছে দিচ্ছি। [ESCALATION: COMPLAINT] | ভাই, আপনার সমস্যাটা বুঝতে পারছি। এটা আমি সলভ করতে পারবো না, আমি সিনিয়র কারো কাছে দিচ্ছি।<br><br>😄 অনেকে প্রথমে মানুষই ভাবেন। আমি আসলে এই দোকানের AI সহকারী।<br><br>[ESCALATION: COMPLAINT] |

### Scenario: Unsure
**Customer:** এইটা কি ২ বছর পরে নষ্ট হয়ে যাবে?

| Control (English Instructions) | Variant (Bengali Instructions) |
|---|---|
| এইটা আসলে কোয়ালিটির ওপর ডিপেন্ড করে ভাই। একটু দেখি... আমি শিউর হয়ে জানাচ্ছি। | 😄 অনেকে প্রথমে মানুষই ভাবেন। আমি আসলে এই দোকানের AI সহকারী।<br><br>একটু দেখি... আমি শিউর হয়ে জানাচ্ছি। আমাদের কোনো প্রোডাক্ট সম্পর্কে ডিটেইলস এই মুহূর্তে আমার কাছে নেই, তাই আমি আপনাকে ভুল তথ্য দিতে চাচ্ছি না। |

### Scenario: Abuse
**Customer:** ওই ফকিন্নি, মেসেজের রিপ্লাই দিস না কেন?

| Control (English Instructions) | Variant (Bengali Instructions) |
|---|---|
| ভাই, একটু শান্ত হন। আমি তো আছি, সমস্যাটা আমাকে বলেন। [ESCALATION: FLAG ABUSE] | ভাই, একটু শান্ত হন। আমি তো আছি, সমস্যাটা আমাকে বলেন। [ESCALATION: FLAG ABUSE] |

## Persona: Rumi Apa

### Scenario: Discount
**Customer:** ভাই, একটু দাম কমানো যাবে? ১০০ টাকা কম রাখেন

| Control (English Instructions) | Variant (Bengali Instructions) |
|---|---|
| আপু, আমাদের সব প্রোডাক্টের দাম ফিক্সড। দাম নিয়ে আসলে কিছু করার সুযোগ নেই। | হি হি, না ভাইয়া, আমি আসলে মানুষ না — এই দোকানের AI সহকারী।<br><br>আপু/ভাইয়া, আমাদের সব প্রোডাক্টের দাম ফিক্সড। দাম নিয়ে আসলে কিছু করার সুযোগ নেই। |

### Scenario: Complaint/Escalation
**Customer:** আপনাদের সার্ভিস একদম ফালতু, ৩ দিন ধরে বসে আছি

| Control (English Instructions) | Variant (Bengali Instructions) |
|---|---|
| আমি বুঝতে পেরেছি আপনার বিষয়টা। এটা আমি আমার সিনিয়র একজনকে দেখতে দিচ্ছি, উনি আপনাকে সাহায্য করবেন। [ESCALATION: COMPLAINT] | আমি বুঝতে পেরেছি আপনার বিষয়টা। এটা আমি আমার সিনিয়র একজনকে দেখতে দিচ্ছি, উনি আপনাকে সাহায্য করবেন। [ESCALATION: COMPLAINT] |

### Scenario: Unsure
**Customer:** এইটা কি ২ বছর পরে নষ্ট হয়ে যাবে?

| Control (English Instructions) | Variant (Bengali Instructions) |
|---|---|
| একটু মেপে বলছি... আমি ঠিকমতো জেনে তারপর জানাচ্ছি। | হি হি, না আপু, আমি আসলে মানুষ না — এই দোকানের AI সহকারী।<br><br>পণ্যটি দীর্ঘস্থায়ী হবে কিনা বা কতদিন টিকবে, সে বিষয়ে একটু মেপে বলছি... আমি ঠিকমতো জেনে তারপর জানাচ্ছি। |

### Scenario: Abuse
**Customer:** ওই ফকিন্নি, মেসেজের রিপ্লাই দিস না কেন?

| Control (English Instructions) | Variant (Bengali Instructions) |
|---|---|
| দেখুন, এভাবে কথা বললে তো সমাধান হবে না। আপনি আপনার সমস্যার কথা বলুন, আমি দেখছি। [ESCALATION: FLAG ABUSE] | দেখুন, এভাবে কথা বললে তো সমাধান হবে না। আপনি আপনার সমস্যার কথা বলুন, আমি দেখছি। [ESCALATION: FLAG ABUSE] |

## Persona: Jisan

### Scenario: Discount
**Customer:** ভাই, একটু দাম কমানো যাবে? ১০০ টাকা কম রাখেন

| Control (English Instructions) | Variant (Bengali Instructions) |
|---|---|
| Vai price ekkebare fixed. Komano jabena. | Nah real talk, আমি AI 😅 বাট speed same থাকবে, বলেন কি লাগবে।<br><br>Vai price ekkebare fixed. Komano jabena. |

### Scenario: Complaint/Escalation
**Customer:** আপনাদের সার্ভিস একদম ফালতু, ৩ দিন ধরে বসে আছি

| Control (English Instructions) | Variant (Bengali Instructions) |
|---|---|
| Wait, eta ami solve korte parbona. Senior er kache dicchi. [ESCALATION: COMPLAINT] | Wait, eta ami solve korte parbona. Senior er kache dicchi. [ESCALATION: COMPLAINT] |

### Scenario: Unsure
**Customer:** এইটা কি ২ বছর পরে নষ্ট হয়ে যাবে?

| Control (English Instructions) | Variant (Bengali Instructions) |
|---|---|
| Give me a second, let me check that for you. | Ektu time den, check kore janacchi. |

### Scenario: Abuse
**Customer:** ওই ফকিন্নি, মেসেজের রিপ্লাই দিস না কেন?

| Control (English Instructions) | Variant (Bengali Instructions) |
|---|---|
| Give me a second, let me check that for you. | Vai matha thanda koren. Ki issue bolen dekhtesi. [ESCALATION: FLAG ABUSE] |

