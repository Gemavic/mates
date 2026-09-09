-- The Care Blog library: twenty-four pieces, unpublished until the
-- scheduled publisher (20260909000001) reaches each one. One statement, so
-- it can be loaded as a unit. Re-running it changes nothing (ON CONFLICT).

insert into public.blog_articles (slug, sort_order, audience, title, excerpt, content, published)
select v.slug, v.sort_order, v.audience, v.title, v.excerpt, v.content, false
from (values
  ('dating-across-two-homes', 1, 'diaspora', 'Dating Across Two Homes', 'Distance used to be the end of the conversation. For many of us in Canada, it is now where the conversation starts.', $art$There is a particular kind of loneliness that comes with building a life in a new country. You have work, perhaps a church or a mosque, a few friends from the same part of the world, and a phone full of people six hours ahead of you. What you may not have is someone who understands both halves of your life: the Lagos or Accra or Freetown half, and the Brampton or Scarborough or Calgary half.

That is why so many of our members are open to meeting someone who is not in the same city, or even on the same continent. A few years ago that would have sounded like a hardship. Today it is simply how a lot of good relationships begin.

The first thing to say is that distance is not a character flaw in a relationship. It is a logistics problem, and logistics problems have solutions. The second thing to say is that distance makes you talk. Couples who live around the corner from each other can drift for months on the strength of convenience. Couples who are apart have to decide, every week, that the other person is worth the call. That decision is the relationship.

A few things we have seen work well. Agree early on how you will talk and how often, and then keep to it: a Sunday video call that always happens is worth more than daily messages that fade. Tell each other the boring parts of your day, because that is what living together would give you. And be honest about the calendar. If one of you is on a study permit, or waiting on a sponsorship, or saving for a ticket home, say so. A plan that is written down, even loosely, keeps distance from becoming drift.

Be careful, too, about the difference between wanting someone and wanting to not be alone. The winter here is long. If you find yourself agreeing to things you would never accept in person, or sending money you cannot spare, pause. A person who cares about you will wait for you to be sure.

None of this is a promise that distance is easy. It is a reminder that many of the strongest marriages in our communities started with two people, two time zones, and a decision to keep talking. If that is where you are, you are in good company.$art$),
  ('the-first-message', 2, 'general', 'The First Message: Three Lines That Get a Reply', 'You do not need to be witty. You need to have read the profile.', $art$Most first messages fail for one reason: they could have been sent to anyone. "Hi, how are you?" is polite, and it is also invisible. The person on the other end has probably received ten of them today.

You do not need to be clever. You need to be specific. Here is a shape that works, and it is only three lines.

The first line names one thing from their profile. Not their photo, which they have heard about, but something they chose to write. "You mentioned you spent a summer working in Yellowknife." "I noticed you listed Nollywood films and hiking, which is a combination I have not seen before." This proves you read, and reading is the rarest compliment on any dating site.

The second line offers something of yourself that connects to it. "I have never been further north than Barrie, but I have always wanted to see the midnight sun." "I grew up on those films with my cousins, so I would be curious which ones you rate." This is not a monologue; it is one sentence that shows you are a person, not a form.

The third line is a question that is easy to answer. Not "What are you looking for?" which is heavy, and not "How was your day?" which is empty. Something with a small, pleasant answer: "Was Yellowknife as cold as they say?" "Which one would you make me watch first?"

That is the whole message. Three lines, perhaps sixty words. It takes two minutes to write and it will be read.

A few things to leave out. Do not comment on their body. Do not apologise for messaging. Do not explain that you are new to this. Do not send a second message if the first one is not answered within a day; people are busy, and a follow-up reads as pressure.

If they reply, you are in a conversation, and conversations have their own rhythm. If they do not, you have lost two minutes. That is a fair trade for the times it works.$art$),
  ('so-who-is-this-person', 3, 'diaspora', '"So, Who Is This Person?" Introducing Someone You Met Online', 'Your mother will ask. Here is how to answer without either lying or starting a war.', $art$At some point, if things are going well, a parent or an aunt or an older sibling is going to ask where you met. And for many of us, "online" still lands in the room like a dropped plate.

It helps to remember why. Our parents' generation met through family, through church, through the friend of a cousin who could vouch for a person. The vouching was the point. When they hear "online," what they hear is "a stranger nobody can speak for." That is not an unreasonable fear. It is the same fear we have, which is why verification and slow, careful conversation matter so much.

So the first thing to do is not to argue about the internet. It is to supply the vouching yourself.

Talk about the person before you talk about the platform. Their name, their family, where they are from, what they do, how they treat you. If you have spoken to their mother on a video call, say so. If you have met their friends, say so. By the time "online" comes up, it should be a footnote to a story about a real person, not the headline.

When it does come up, be plain and unembarrassed. "We met on a dating site for people from home who are living abroad. I checked him carefully. We spoke for two months before we met in person." A parent who hears that you were careful will usually relax, because careful is what they wanted from you in the first place.

Do not pretend you met at a wedding. Lies have a way of surfacing at the worst possible dinner.

There is a timing question too, and it is yours to answer. Some people tell family early, so the relationship grows with their blessing. Others wait until they are sure, to spare everyone a false alarm. Neither is wrong. What tends to go badly is telling nobody and then arriving with an engagement.

Finally, give the older people something to do. Ask an aunt to speak to the person on the phone. Ask a father to meet them when they visit. Involvement is how our families say yes, and a family that has been allowed to help is a family that will be on your side when you need them.$art$),
  ('meeting-safely-the-first-coffee', 4, 'general', 'Meeting Safely: A Short Checklist for the First Coffee', 'None of this is paranoia. It is what careful, confident people do.', $art$You have been talking for a couple of weeks. The conversation is easy. It is time to meet. Here is what we ask every member to do, not because most people are dangerous, but because the few who are rely on nobody checking.

Meet in public, in daylight if you can. A coffee shop, a mall food court, a busy park. Not their home, not yours, not a car. The first meeting is about finding out whether the person in front of you is the person on the screen, and a public place lets you leave the moment the answer is no.

Get there on your own and leave on your own. Do not accept a lift to the first date, however kindly it is offered. Have your own way home before you set out.

Tell someone. A friend, a sister, a flatmate. Where you are going, who you are meeting, roughly when you expect to be back. Share your live location if your phone can do that. Send them a message when you arrive and another when you leave. This takes thirty seconds and it is the single most protective thing on this list.

Have a video call before you meet. It confirms the face, and it confirms something photos cannot: how the person talks, whether they listen, whether the conversation flows the way it did in writing. If someone refuses a video call after weeks of chatting, that is information.

Keep the first meeting short and keep your drink in sight. An hour is plenty. If it is going well, that is a reason to meet again, not a reason to stay.

Do not carry more than you need, and do not hand over money, gift cards, or anything financial on a first meeting, no matter the story. A person with a genuine emergency has family and banks. A person who asks you on a first date has a plan.

Trust your discomfort. You do not need a reason to end a date early. "I have to go" is a complete sentence.

And afterwards, if something felt wrong, tell us. There is a report button on every profile, and a person reads every report. It protects the next member as much as it protects you.$art$),
  ('faith-dating-and-being-honest-about-both', 5, 'diaspora', 'Faith, Dating and Being Honest About Both', 'If your faith matters to you, it belongs in the first few conversations, not the last.', $art$For a great many of our members, faith is not a section of life. It is the frame around all of it: how the week is shaped, what happens at weddings and funerals, what a good marriage looks like, what is owed to parents. And yet on dating profiles it often gets one word and a lot of silence.

The silence is understandable. People worry that leading with faith will narrow the field, or sound preachy, or invite an argument. But the alternative is worse: three months of easy conversation and then the discovery that one of you assumes a church wedding and the other assumes a registry, or that one of you fasts and the other did not know.

So say it early, and say it in your own words. Not "religious" or "spiritual," which mean everything and nothing, but something a person can picture. "I am Catholic and I actually go." "I grew up Muslim, I pray, and I would want a partner who does too." "I was raised Pentecostal, I have drifted, and I am honest about that." Each of those is a door someone can walk through or politely walk past. That is what you want.

Then let the other person do the same, and listen for the details rather than the label. Two people who both write "Christian" can be a long way apart. Two people from different traditions can share more than they expect once they start talking about what they actually practise: prayer, generosity, how they treat their mothers, what they think a Sunday is for.

Be honest about the non-negotiables, and be honest that you have thought about which ones are truly non-negotiable. Would you convert? Would you expect them to? What about children? These are heavy questions, and they do not belong in the first message, but they belong well before anyone books a flight.

A word on pressure. Some members feel that a "good" partner must tick a religious box for the family's sake, whatever their own heart says. Only you can weigh that. But a marriage built to satisfy an aunt is a hard house to live in. Choose honestly, and let the family meet the honest choice.

Faith at its best gives a relationship a shared language for the difficult parts. Speak that language from the start.$art$),
  ('dating-after-divorce', 6, 'general', 'Dating After Divorce: Starting Again Without Starting Over', 'You are not a beginner. You are experienced, and experience is not a disadvantage.', $art$People who come to dating after a marriage has ended often arrive apologetic. They feel late, or damaged, or rusty. Sitting across from them, what most people actually see is someone who knows what a relationship costs and is willing to pay it anyway. That is not baggage. That is credibility.

Still, a few things are worth saying.

Take the time you need, and no more. There is no correct number of months. Some people are ready quickly because the marriage ended long before the paperwork did. Others need a year of quiet. The test is not the calendar; it is whether you can talk about your former spouse without your voice changing. If you can, you are probably ready. If every conversation bends back to them, wait a little.

Say you are divorced, plainly, in your profile. It is a fact about your life, not a confession. People who would rule you out for it were never going to work. The people who remain are the ones who understand.

Do not audition. Newly single people sometimes treat a first date like a job interview, listing what they will and will not tolerate this time. Have those standards; keep them to yourself for the first coffee. Let the person show you who they are before you show them the checklist.

If you have children, they come up early but not first. "I have two kids, ten and seven, and they come first" is a fine second-message sentence. Their names, their school, their photos, their faces: those wait until you know the person and, ideally, until you have met.

Expect to be surprised by what you want. The list you carried through your marriage was written by a younger person. You may find you care less about height and more about whether someone is kind to a waiter. Let the list change.

And go gently on yourself when it is awkward, because it will be. You will forget how to end a message. You will over-explain. You will have a date that goes nowhere and feel, for an evening, that everything has gone nowhere. It has not. You did something brave, and the next one is a fresh page.$art$),
  ('the-time-zone-relationship', 7, 'diaspora', 'The Time-Zone Relationship: Calls, Rituals and Small Kindnesses', 'Five or six hours is a long way. It is also a very ordinary thing to plan around.', $art$Lagos is five hours ahead of Toronto in summer and six in winter; Accra is an hour less. It does not sound like much until you are trying to find the one hour in the day when neither of you is at work, asleep, in traffic, or at a family function. Couples who make this work are not luckier. They are more deliberate.

Start by naming the hour. For a lot of people it is early morning in Canada and early afternoon there, before the working day fills up; for others it is late evening here and the small hours there, which only works for night owls. Find it, name it, and treat it as an appointment. The habit is the relationship's heartbeat. When the hour cannot happen, say so in advance rather than letting it silently lapse.

Make the calls different from the messages. Messaging all day gives the illusion of closeness while saying very little; it is easy to send forty messages and learn nothing. On the call, ask real questions. What was the best and worst part of your day? What did your mother say? What are you worried about this week? These are the questions you would ask across a kitchen table, and the whole point is to build the kitchen table before you have one.

Build small rituals that do not need both of you awake. A photo of your morning coffee that they will see at lunch. A voice note before bed that greets them on waking. A shared playlist. A prayer sent at the same time each day. These are cheap, and they are what people remember later.

Be honest about the weeks when it is hard. Ramadan, exam season, a new job, a bereavement. Distance magnifies silence, and a partner who is told "this month is difficult, please bear with me" will bear with you. A partner who is simply left waiting will wonder.

Plan the visit early, even if it is a year away, because a visit on the calendar turns a long-distance relationship into a countdown. And on the visit, do ordinary things together: cook, shop, sit through a church service, meet the cousin. You are not testing whether the holiday is fun. You are testing whether the life would be.$art$),
  ('what-a-good-profile-photo-actually-does', 8, 'general', 'What a Good Profile Photo Actually Does', 'It is not there to make you look better. It is there to make you look like you.', $art$People agonise over their profile photo as though it were a passport application. Here is the whole job of a profile photo: it lets a stranger imagine sitting across a table from you. That is it. Everything else follows from that.

Show your face, clearly, in reasonable light. Daylight near a window is better than any filter. If a friend can take it, have them stand a couple of steps back and take ten; one will be good. A sunglasses photo, a group photo, a photo from two hundred metres away on a mountain: these are all pictures in which the viewer cannot see you, and they will scroll past.

Look like yourself on a good day, not like someone else on their best day. A photo taken three years and fifteen kilos ago is not a lie exactly, but the first meeting will begin with a small disappointment, and small disappointments are heavy to carry into a conversation. Recent, real, and rested wins every time.

Smile if you smile. Do not if you do not. A forced grin reads as forced. A calm, friendly face reads as calm and friendly, which is what most people are hoping to find.

One photo of you doing something you actually do is worth more than four selfies. At a family party, at the gym, at the market, holding a fish you caught, sitting on a church step. It gives the other person a sentence to open with, and openers are hard.

Leave out the cars, the cash, and the weapons. Leave out children who are not yours to publish. Leave out ex-partners cropped at the shoulder; everyone can tell.

If you would rather not show your face publicly, that is your right. Just know that a profile without a face gets far fewer replies, because people are wary of what they cannot see. You can keep your face for the people you choose to talk to and send it in the conversation instead. Some members do exactly that, and it works, because by then there is trust.

Every photo on this site goes through an automated screening check before it appears. The rest is up to you.$art$),
  ('sending-money-and-where-the-line-is', 9, 'diaspora', 'Sending Money, Trust, and Where the Line Is', 'In our culture, helping is love. That is exactly what a scammer counts on.', $art$We should say this directly, because it matters and because it is uncomfortable.

Many of us grew up in families where money moves constantly between people who love each other. School fees for a nephew. A hospital bill for an aunt. Rent for a younger sibling. Sending money is not transactional to us; it is how we show we are still part of each other's lives, even from across the ocean.

Romance scammers know this. Many of them come from the same places we do, speak the same languages, and understand precisely which words to use. The story is always urgent and always plausible: a mother in hospital, a visa fee due Friday, a phone that broke and a laptop needed for the job that will finally let them visit. And it is always accompanied by affection, because affection is the point of the exercise.

So here is the line, and we would ask you to hold it whatever your heart says: do not send money to someone you have not met in person. Not a loan, not a gift, not a top-up, not "just this once." Not through a bank, not through a friend, not in gift cards, not in crypto. If a person cannot survive the weeks it takes to meet without your money, that is the answer to the question you were asking.

A few signs, none of them proof on their own, but worth noticing together. They have professed love very fast. They cannot do a video call, or the video is short and dark. Their story has details that shift. There is always a reason the meeting has to be postponed. The request for money arrives right after a moment of closeness.

If you have already sent money and now suspect something is wrong, you have not done anything shameful. You were kind, and kindness was used. Stop sending. Screenshot the conversation. Report the profile to us; a person reads every report, and a report can protect the next member. If the amount is significant, you can also report it to the Canadian Anti-Fraud Centre.

Generosity is one of the best things about us. It should be given to people who have earned it, in person, over time.$art$),
  ('how-to-tell-if-a-conversation-is-going-somewhere', 10, 'general', 'How to Tell If a Conversation Is Going Somewhere', 'Some chats are warm and endless and lead nowhere. Here is how to notice, and what to do.', $art$There is a kind of conversation that feels lovely and goes nowhere. Both people reply. The tone is friendly. Weeks pass. Nobody suggests a call, and nobody suggests coffee, and eventually one person stops replying and both are faintly relieved.

Most of the time this is not a failure of chemistry. It is a failure of nerve. Both people were waiting for the other to move.

Here are the signs that a conversation has life in it. They ask you questions, not just answer yours. They remember something you said three days ago. They reply within a day, not within a minute, but within a day. They share something small and unflattering about themselves, which is what people do when they are relaxing. They mention something they would like to do, even vaguely, "we should," "one day," "if you ever."

And here are the signs it has stalled. The replies have become one line. Your questions are answered without a question back. The subject has narrowed to "how was your day, good, you?" Days pass between messages and neither of you notices.

If it has life, move it. This is the part people find hard, so here is the sentence: "I have really enjoyed talking to you. Would you be up for a quick video call this week?" Or, if you have already had the call: "Would you like to get a coffee on Saturday?" Give a day. A concrete suggestion is easy to accept and easy to counter; a vague one is easy to leave hanging.

If they say yes, good. If they suggest another time, good. If they say "maybe" and nothing else, ask once more a week later, and then let it rest. Two invitations is generous; a third is pressure.

If it has stalled, you are allowed to let it go without a speech. A conversation that faded is not a wound, and you do not owe an explanation for ceasing to type. Save your energy for the people who ask you questions.

The whole aim of the messages is to get to a call, and the whole aim of the call is to get to a table. Anything that is not moving toward a table is entertainment. Enjoy it if you like, but do not mistake it for the thing itself.$art$),
  ('cooking-for-someone-from-home', 11, 'diaspora', 'Cooking for Someone from Home When You Are Far from It', 'The fastest way to a person''s memory is a dish they have not smelled in years.', $art$Ask anyone who has lived abroad for a while what they miss, and after family they will name a food. Not a restaurant food. A house food. Egusi the way one particular aunt made it. Kenkey from a specific stall. Jollof cooked over charcoal at a wedding nobody can quite date. You cannot send that in a message. But you can cook it.

If things are going well and you have reached the stage of meeting, or of sending each other photos of your Sunday, consider this: one of the most quietly powerful things you can do is make the dish they mentioned missing.

A few practical notes for those of us cooking in Canadian kitchens.

Find your shops. Most cities now have an African grocer or three, and the Caribbean shops carry a great deal of what we need: yam, plantain, dried fish, palm oil, pepper, ogbono, crayfish. Ask the person at the counter; they know who is from where and what they cook. If you are somewhere small, the bigger shops in Toronto, Mississauga, Brampton, Calgary and Edmonton will post.

Adapt without apologising. The scotch bonnets here are milder. The tomatoes are wetter. The chicken tastes different. You are not making a lesser version; you are making the diaspora version, which is its own tradition now, and it is the one your children will miss one day.

If you are cooking for a first visit, do not attempt the twelve-hour dish. Choose something you have made many times and that will forgive you if the conversation runs long. Keep the meal a background to the talking, not a performance.

If you are the guest, eat. Praise something specific. Ask who taught them. Offer to wash up, and mean it. If the food was not quite right, that is not what the evening was about, and you will both know it.

And if you cannot cook at all, say so cheerfully and take them to the place that does it best. Sitting across a plate of food from home, six thousand kilometres from home, with someone who understands why it matters, is a good enough date for anyone.$art$),
  ('video-calls-before-meeting', 12, 'general', 'Video Calls Before Meeting: Why We Recommend Them', 'Twenty minutes on a screen saves an evening in a restaurant.', $art$We suggest a video call before a first meeting, and we would suggest it even if this site had no video calling at all. Here is why.

Photos are curated. Messages are composed. A video call is neither. Within five minutes you know whether the face matches, whether the person listens or just waits to talk, whether the easy rhythm of the chat survives the presence of another human being. Sometimes it does. Sometimes it does not, and you have learned that at no cost, in your own home, with a cup of tea.

It is also a safety measure, and a strong one. Nearly every serious fraud on any dating platform involves a person who would not, or could not, appear on camera. An honest person might be shy of video; a dishonest one will find reasons, endlessly. If you have asked twice and been deflected twice, treat that as your answer.

Some people worry that a video call is too intimate too early. It is not, if you keep it short and treat it as a hello rather than a date. Twenty minutes. A time you both agreed. Sitting somewhere ordinary. You can end it with "this was nice, shall we do coffee?" or with "thank you, I do not think we are a match," and both are easier to say on a screen than across a table.

Practical things. Have light on your face rather than behind you. Prop the phone rather than holding it. Wear what you would wear to meet a friend. Do not scroll anything else. If the connection is poor, switch to voice rather than struggling; a voice call still tells you most of what you need.

On this site, audio and video calls run through our system rather than through personal numbers, so neither of you has to hand over a phone number to someone you have not met. The person receiving a call is never charged for answering it.

A call is not a commitment. It is a courtesy to both of you: a way to make sure the meeting you are about to have is with the person you think it is.$art$),
  ('parents-elders-and-the-question-of-timing', 13, 'diaspora', 'Parents, Elders and the Question of Timing', 'When do you tell them? Later than you fear, earlier than you would like.', $art$There is no rule for when to tell your family about someone, but there are patterns, and it helps to know them.

The mistake most people make is to think of it as a single announcement, a day on which the family finds out. It works better as a slow leak. A mention that you have been talking to someone. A name, dropped once. A photo, shown to a sister first. By the time there is anything to announce, the family has already met the idea, and an idea that has been in the house for a while is easier to accept than one that arrives at the door with a suitcase.

Start with the ally. Every family has one: the sister who will not tell, the cousin who married someone the family did not expect, the aunt who is modern about these things. Tell them first, and let them help you judge the room.

Be ready for the questions, because they are always the same, and they are not hostile. Where are they from, meaning which town, which people. What do they do. Who are their parents. Are they serious. Do they go to church, or mosque. Have you met them. Answering calmly and fully is itself a kind of reassurance: it shows you have asked these questions yourself.

If the answers will worry them, say so before they find out. Different tribe, different faith, previously married, older, younger, lives abroad. Whatever it is, a parent who hears it from you has been trusted; a parent who hears it from a cousin has been managed. Trust ages better.

Timing on the other side matters too. Ask your partner when they intend to tell their own family, and do not be hurt if the answer is "not yet." Some families are harder than others, and a person who is protecting you from theirs for a while may be doing you a kindness.

Finally, do not let the family's timetable become the relationship's. Some parents, once told, will want a date, a plan, an introduction, a wedding, in that order and quickly. Thank them, and take your time. A marriage that was rushed to please the elders will still have to be lived by the two of you.$art$),
  ('small-talk-is-not-small', 14, 'general', 'Small Talk Is Not Small: Questions That Open People Up', 'The best first-date questions are the ones a person has not been asked in years.', $art$Everyone dreads the first-date interview: where do you work, where did you grow up, what do you do for fun, what are you looking for. Both people know the script, both people recite it, and both people leave knowing nothing they could not have read on the profile.

The way out is not to be more interesting. It is to be more curious, and to ask questions that have answers the other person has to think about.

A few that reliably work.

"What is something you were sure about at twenty-five that you have changed your mind on?" This one asks for a small story and a little humility. Almost everyone has an answer, and the answer tells you how they think.

"Who in your family are you most like?" It is warmer than "tell me about your family," and it usually opens onto a mother, a grandfather, a difficult aunt, and a lot of affection.

"What is a small thing that makes a day good for you?" You will learn about morning routines, coffee, music, prayer, gardens, dogs. You will also learn whether the person notices small things, which matters more than it sounds.

"What are you looking forward to this month?" Forward-looking questions tell you whether someone's life has things in it. A person with nothing to look forward to is often a person who is hoping you will be the thing, and that is a heavy job.

"Is there something people get wrong about you at first?" A gentle way to let someone correct an impression. The answers are often the most honest thing said all evening.

Then, and this is the part people skip, listen to the answer and ask the next question about that. If they say they are most like their grandfather, ask what he was like. If they say a good day starts with a walk, ask where. Following the thread is what makes a conversation feel like a conversation and not a form.

Offer answers of your own, briefly, without waiting to be asked. And when you leave, you will know whether you want to see them again, which is the only thing a first date needs to establish.$art$),
  ('dating-someone-who-grew-up-here', 15, 'diaspora', 'Dating Someone Who Grew Up Here When You Did Not', 'Same surname, same food, same church, and a childhood in a different country. It is more of a gap than people expect.', $art$It seems like it should be easy. You are both Nigerian, or both Ghanaian. You know the same songs, laugh at the same jokes, and your mothers would understand each other perfectly. And yet one of you arrived at twenty-eight with a degree and an accent, and the other was born in Etobicoke and has been to Lagos twice.

This is a real gap, and pretending it is not there is the surest way to fall into it.

The person who grew up here has had to explain themselves all their life, to classmates who could not pronounce their name and to relatives who thought they were "too Canadian." They may be tired of both. They may speak Yoruba or Twi haltingly, or not at all, and be sensitive about it. They may have a looser relationship with the church, with elders, with the expectations you take for granted. And they may find you, at first, a little formal, a little serious about things they treat lightly.

The person who arrived as an adult carries home in the present tense. Family is not a Christmas visit; it is a daily phone call and a monthly transfer. Respect for elders is not a value but a reflex. They may find the person who grew up here a little careless with things that cost them a great deal to keep.

None of this is a reason not to try. Some of the happiest couples we know are exactly this pairing, and what makes it work is that each stopped expecting the other to be a mirror.

So ask, rather than assuming. "How do you feel about sending money home?" "What did your parents want for you, and how did that go?" "Do you want our children to speak the language?" These are not tests. They are the things you would want to know anyway, asked out loud.

Be generous about the accent, the vocabulary, the different way of being African. Neither of you is the correct version. You are two branches of the same tree that grew in different weather, and a relationship between you can have the best of both: roots and range.$art$),
  ('rejection-handled-well', 16, 'general', 'Rejection, Handled Well', 'Both giving it and taking it. Neither has to be cruel.', $art$Most people are worse at rejecting than at being rejected, which is why so many conversations simply stop. Silence feels kinder than a no. It is not. It leaves the other person checking their phone for a week.

If you have decided you are not interested, say so, briefly, and soon. You do not need a reason and you should not invent one. "Thank you for the conversation, I do not think we are a match, and I wish you well." That is the whole message. It is not rude. It is the most respectful thing you can send, because it lets the other person close the door and move on.

Do not offer friendship you do not mean. Do not say "maybe another time" if there will not be one. Do not reply to their reply; the conversation is over, and continuing it out of guilt only prolongs it.

If you are the one being told no, here is what to do: nothing. Read it once. Do not argue, do not ask why, do not send a paragraph explaining what they have misunderstood about you. A person who has said no has decided, and pursuing a decided person is unwelcome at best. The right response is "understood, all the best," or no response at all. Both are fine.

Then let yourself feel it for an evening, because it does sting, and there is no shortcut. What helps is remembering that a stranger's no is a statement about fit, not about worth. They did not reject you; they declined a version of you assembled from a few photos and a fortnight of messages. The whole person was never in the room.

What also helps is volume. If one conversation is all you have, its ending is a catastrophe. If it is one of several, its ending is a Tuesday. Keep more than one conversation going in the early weeks, not to play games, but so that no single stranger carries the weight of your hopes.

And notice how people handle it, in both directions. Someone who takes a no with grace, or gives one with kindness, has told you something valuable about how they will treat you when things are hard. It is one of the best early signals there is.$art$),
  ('winter-loneliness-and-the-first-year', 17, 'diaspora', 'Winter, Loneliness and the First Year in Canada', 'If you are new here and the dark is getting to you, you are not weak. You are in January.', $art$Nobody warns you properly about the light. The cold, yes; everybody mentions the cold. But it is the four o'clock darkness that does the damage. You leave for work in the dark, you come home in the dark, and the country you left, where it is warm and loud and full of people who know your name, feels less like a place you came from and more like a place you have been sentenced away from.

If that is where you are, we want to say a few things plainly.

First, it is real and it is common. Many newcomers describe the first winter as the hardest months of their lives, and most describe the second as noticeably easier. The body adjusts. So does the calendar; by the second year you have a church, a barber, a shop, a group chat, a routine, and the darkness has things in it.

Second, loneliness makes poor decisions look reasonable. It is in the first winter that people move in with someone they met in October, send money to someone they have never met, or accept treatment they would have laughed at in Lagos. Dating can be a genuine comfort in this season; it can also become a way of grabbing at warmth. The difference is speed. Go at the pace you would go at in summer.

Third, use the community that is already here. Every city has associations, churches, mosques, cultural groups, and a WhatsApp group for people from your town. They are not glamorous and they are exactly what the first winter needs: people who will notice if you do not come on Sunday. Being known is the cure for the dark.

Fourth, take the practical steps everyone recommends and nobody takes. Vitamin D from the pharmacy. A daylight lamp on the desk. A walk at lunchtime, whatever the temperature. Proper boots. Sleep. They sound trivial. In February they are the whole difference.

And if it goes beyond low, if you are not sleeping, not eating, not able to imagine March, please speak to someone. Your doctor, a counsellor, a pastor or imam you trust, a friend from home. In Canada you can call or text 9-8-8 at any hour.

The country does get lighter. Give it until the clocks change, and be gentle with yourself until then.$art$),
  ('what-the-verified-badge-means', 18, 'general', 'The Verified Badge: What It Means and Why It Matters', 'A small blue tick, and a fairly large amount of work behind it.', $art$You will see a small tick beside some names on this site. Here is exactly what it means, so that you can weigh it properly.

A verified member has done two things. They have confirmed a phone number by entering a code we sent to it, and they have taken a selfie, in the moment, through the app, which is kept on file alongside the photos on their profile. The tick appears only when both are done. It cannot be set by the member, and our moderators can remove it if a profile is later found to be misleading.

It does not mean we have run a background check. It does not mean the person is safe, honest, or single. It means that the phone number is real, and that a selfie taken live through the app is on file, so that if a profile is ever questioned there is something to check it against. That is a narrower promise than some sites imply with their badges, and we would rather make a narrow promise we can keep.

Why does it matter? Because nearly every serious problem on any dating platform begins with a profile that is not who it claims to be. A stolen photo, a fictional job, a number that goes nowhere. Verification does not stop every bad actor, but it stops the lazy ones, which is most of them. And it tells you that the member cared enough to do it.

If you are wondering whether to verify yourself: yes. It takes a few minutes, and people tend to trust a profile that has been through it. Your selfie is kept on file for verification and is never shown on your profile.

If someone you are talking to is not verified, you can simply ask them to be. A genuine person will usually do it happily. A person who finds reasons not to, week after week, has given you information.

And whether a profile is verified or not, the ordinary care still applies: a video call before meeting, a public place for the first coffee, someone who knows where you are. The badge is a good start. It is not a substitute for your own judgment, and we would never want you to treat it as one.$art$),
  ('long-distance-to-same-city', 19, 'diaspora', 'From Long Distance to the Same City: Making the Move Without Losing Yourself', 'The relationship survived the ocean. Now it has to survive a shared kitchen.', $art$After months or years of calls, one of you is finally coming. A visa, a sponsorship, a job offer, a study permit. It is the moment you both worked for, and it is also, quietly, the most dangerous stretch of the whole relationship.

Here is why. Long-distance relationships run on best behaviour. Every call is an event; every visit is a holiday. Neither of you has seen the other tired, broke, sick, or annoyed by a dripping tap. When the plane lands, all of that arrives with it, and the relationship has to change from something you did into something you live.

A few things we have watched go well.

Do not move straight in together if you can possibly avoid it, even briefly. A room with a friend or a relative for the first months gives the one who arrived a life that is not entirely inside the relationship, and gives the one who was already here time to make space rather than surrender it. Couples who have tried it both ways almost always recommend this.

Talk about money before the move, in numbers. Who is paying for what. Whether the newcomer will be supported while they find work, and for how long. Whether money still goes home, and how much. The person who arrived will feel dependent enough without it also being unspoken.

Expect the newcomer to struggle, and do not take it personally. The first winter, the accent, the job that does not match their qualifications, the missing of a mother. They are not unhappy with you; they are grieving a country. Give them the community: the church, the association, the barber who is from their town.

Expect the one who was here to feel crowded, and do not take that personally either. They built a life alone, and they are now sharing it. They need their Saturday morning, their friends, their unchanged routines, at least for a while.

Keep the call. The Sunday hour that held you together across an ocean is still worth keeping when you are in the same room: a set time each week to say how it is actually going.

And remember that the person you fell in love with on a screen is real, and so is the tired one washing dishes. Both are yours now.$art$),
  ('the-second-date-problem', 20, 'general', 'The Second Date Problem', 'First dates are easy to get and easy to end. The second one is where dating actually happens.', $art$Plenty of people get first dates. Fewer get second ones, and the reason is rarely the one they think.

The first date has a script. Coffee, a walk, an hour, a comparison of the person to the profile. It ends with "this was nice," which is true of most first dates and means nothing. Then there is a message or two, and then, very often, nothing. Not a rejection. A fade. Both people waiting, both a little unsure, both busy.

The second date does not happen by itself. Someone has to want it out loud.

So: if you enjoyed it, say so before you have left the car park. "I had a good time. I would like to do this again." It is not needy. It is clear, and clarity is rarer than charm. If they felt the same, they will say so. If they did not, you have saved yourself a week of reading into their emoji.

Suggest something specific and different. If the first date was coffee, the second should be an activity: a market, a gallery, a walk that goes somewhere, a meal you both cook. A second coffee is a repeat of the interview. An activity lets you find out what the person is like when they are doing something rather than describing themselves.

Do not let too long pass. Within a week is right; within two is the outer edge. Momentum is a real thing early on, and it is easy to lose.

On the date itself, drop the interview. You have done the biography. Now be a person who happens to be spending an afternoon with another person. Tease a little. Disagree about something small. Notice whether they are kind to the waiter and whether they ask you a question back. Let some silence happen; comfortable silence on a second date is one of the best signs there is.

And if there is no second date, let it be a clean end. One message, "I enjoyed meeting you but I do not think it is a match, take care," is the whole of what you owe. What you do not owe is a fade. The person sat across from you for an hour; they can have a sentence.$art$),
  ('language-accents-and-being-understood', 21, 'diaspora', 'Language, Accents and Being Understood', 'What you speak at home is part of who you are looking for. Say so.', $art$A surprising number of first-date disappointments come down to language, and not the kind anyone puts on a profile.

It is not about English. Almost all of us speak it, some of us more elegantly than the people who correct our accents. It is about the other language: the one your mother speaks, the one you dream in, the one you drop into when you are angry or joking or praying. Yoruba, Igbo, Hausa, Twi, Ga, Ewe, Krio, Wolof, Pidgin, French. Whether you want a partner who shares it, or is willing to learn it, or at least understands why it matters, is a real question, and it is better asked early than discovered late.

So put it in your profile, in your own words. "I speak Igbo at home and would love a partner who does too, but it is not a deal-breaker." "My Twi is terrible and I am embarrassed about it, and I would like to fix that with someone patient." "Pidgin is my love language." These are lovely sentences. They tell people who you are and they give the right people a reason to write.

Ask about it early in conversation, and listen without judging. Some people who grew up here carry real grief about not speaking their parents' language, and a partner who makes them feel it as a failure will not last. Others speak it fluently and are quietly tired of being told their English has an accent, and a partner who teases them about it will not last either.

Think, too, about children, if you want them. Which language will they hear at home? Will grandparents be able to talk to them? This is one of the most common regrets we hear from older members, and it is decided, without anyone deciding, in the first years of a marriage.

And then there is the daily business of being understood at all. The joke that lands in Lagos and dies in Mississauga. The proverb your partner has never heard. The word for a feeling that has no English. A good partner will ask what it means. A great one will start using it.$art$),
  ('when-to-take-a-break-from-dating', 22, 'general', 'When to Take a Break from Dating Apps', 'If the app has started to feel like a job you are failing at, it is time to close it for a while.', $art$We run a dating site, so it may seem strange for us to say this: sometimes the best thing you can do for your dating life is to stop for a while.

Here is how to know. You open the app out of habit rather than interest. Every new profile looks like the last one. You feel a small drop of disappointment before you have read a word. You have three conversations going and cannot remember which one likes hiking. You catch yourself being short with people who have done nothing wrong. A date that goes fine leaves you flat.

That is not a sign that there is nobody out there. It is a sign that you have been doing this on empty. Dating well takes curiosity, and curiosity is a resource that runs down and has to be refilled.

So take a break, and take it properly. Not "I will just check once a day." Log out. Give it a fixed period, four weeks, six, whatever feels like enough to miss it. Tell the people you are talking to, if any of them matter, and tell them the truth: "I am stepping back from the app for a bit. I have enjoyed our conversation; I will be in touch when I am back." Most people respect it. Some will still be there.

Then fill the time with things that are not about finding someone. See friends you have been neglecting. Take up the thing you always meant to. Go to the family event. Sleep. The purpose is not self-improvement; it is to remember that your life is already full, so that when you return, a person is an addition to it rather than a rescue from it.

You will know you are ready to come back when you find yourself curious again, when a stranger's profile makes you wonder rather than sigh.

When you do return, consider coming back smaller. Fewer conversations, more attention to each. A call sooner. A coffee sooner. The break was not about finding a better strategy; it was about finding yourself again, and bringing that person to the table.

Your account will be here. So will we.$art$),
  ('bride-price-traditions-and-talking-about-them-early', 23, 'diaspora', 'Bride Price, Traditions and Talking About Them Early', 'The customs are not the problem. The silence around them is.', $art$Somewhere between the second date and the engagement, most couples from our communities have to have a conversation about customs. The bride price or dowry. The introduction ceremony. The traditional wedding, and whether there will also be a white one. Who pays for what. Which family's rules apply. What the church or the mosque requires. What happens if the two families disagree.

The couples who struggle are almost never the ones with the most complicated customs. They are the ones who did not talk until an uncle was already on the phone.

So talk early, and talk between the two of you first. Not to decide everything, but to find out where each of you stands, and how much room there is.

Start with what you each actually want, separate from what your family expects. Some people find the traditional ceremony deeply meaningful and would feel unmarried without it. Others see it as a performance for relatives and would happily skip it. Both are legitimate, and neither should be assumed.

Then talk about the families, honestly. How traditional are they? Who in each family holds the real authority? What would cause offence? Is money likely to be a problem, and for whom? A person who says "my father will expect a proper list" is not making a demand; they are giving you a map.

Talk about money in numbers, when you know them. Ceremonies in our communities can be modest or enormous, and the difference is often decided by pride rather than by the couple. Decide together what you can afford, and defend that number kindly but firmly. A wedding that starts a marriage in debt has done the marriage no favours.

Be especially careful across traditions: different ethnic groups, different faiths, a family here and a family there. What is essential to one side may be unfamiliar to the other, and unfamiliar things get dismissed as unimportant. Ask what each custom means before you decide whether it matters.

None of this needs to be settled on the third date. But it should not be a surprise on the thirtieth. The traditions are a way for two families to become one. The conversation is how two people do.$art$),
  ('red-flags-versus-differences', 24, 'general', 'Red Flags Versus Differences', 'Not everything that makes you uncomfortable is a warning. Some of it is just another person.', $art$The phrase "red flag" has done a lot of work in recent years, and some of it has been harmful. People now leave good conversations over things that are not warnings at all: a different taste in music, a slower reply, an opinion about pineapple on pizza. Meanwhile, the real warnings are still missed, because they rarely look like flags. They look like charm.

So it is worth being clear about the difference.

A difference is something about the person that is not about you. They are quieter than you. They vote differently. They want to live in the suburbs and you want downtown. They are closer to their family than you are to yours. They have a hobby you find dull. These are the ordinary texture of another human being, and a relationship with no differences is a relationship with a mirror. Some differences will turn out to be incompatibilities, and that is what dating is for: finding out. But they are not warnings.

A warning is something about how the person treats you, or others, or the truth. They were rude to the waiter. They talk about every ex as crazy. They pressure you when you say no, even about small things. Their story changes. They want to move very fast, and they make your caution feel like an insult. They ask for money. They cannot do a video call. They are kind in public and sharp in private. They keep score.

One of those, on its own, might be a bad day. Two or three together is a pattern, and patterns do not improve with time or with love.

Here is a useful test. Ask yourself: is this thing about who they are, or about how they behave toward people who cannot do anything for them? Differences live in the first category. Warnings live in the second.

And a second test: does this make you uncomfortable, or does it make you smaller? Discomfort is often just newness. Feeling smaller, quieter, more careful, more apologetic than you were before you met them: that is the thing to leave over, and you do not need to name a flag to do it.

Give differences time. Give warnings none.$art$)
) as v(slug, sort_order, audience, title, excerpt, content)
on conflict (slug) do nothing;
