import { defaultEvidenceCodeForKey } from '../services/evidence-code.js'

const formsUrl = 'https://postgrads.mfu.ac.th'
const ethicsUrl = 'https://gradethic.mfu.ac.th'
const registrationUrl = 'https://reg.mfu.ac.th'

const form = (code, name) => [`${code} – ${name}`, formsUrl]
const bilingualDescription = (english, thai) => `${english}\n(${thai})`

function createPlanTemplates(prefix, degreeLevel, plans, definitions) {
  return definitions.map((definition, index) => ({
    ...definition,
    key: `${prefix}-${definition.key}`,
    evidenceCode: defaultEvidenceCodeForKey(definition.key),
    degreeLevel,
    plans,
    sequenceOrder: index + 1,
    prerequisites: [],
  }))
}

const ethics = {
  key: 'ethics-training',
  title: 'Attend Ethics Training (เข้ารับการอบรมจริยธรรม)',
  description: bilingualDescription(
    'Students who have attended the orientation activity are not required to complete additional ethics training. Students who have not attended the orientation activity must complete the ethics training.',
    'นักศึกษาที่เข้าร่วมกิจกรรมปฐมนิเทศแล้ว ไม่จำเป็นต้องเข้ารับการอบรมจริยธรรมเพิ่มเติม ส่วนนักศึกษาที่ยังไม่ได้เข้าร่วมกิจกรรมปฐมนิเทศ ต้องเข้ารับการอบรมจริยธรรม',
  ),
  references: [ethicsUrl],
}

const masterEnglish = {
  key: 'english-proficiency',
  title:
    'Submit English Proficiency Test Result (ส่งผลการทดสอบความสามารถทางภาษาอังกฤษ)',
  description: bilingualDescription(
    'Students who have passed the AE1 course are not required to submit the DGC24 form.',
    'นักศึกษาที่เรียนผ่านรายวิชา AE1 แล้ว ไม่จำเป็นต้องยื่นแบบฟอร์ม DGC24',
  ),
  references: form('DGC24', 'แบบยื่นผลการทดสอบความสามารถภาษาอังกฤษ'),
}

const advisor = {
  key: 'advisor-appointment',
  title: 'Appoint an Advisor (แต่งตั้งอาจารย์ที่ปรึกษา)',
  description: null,
  references: form('DGC06', 'คำร้องขอแต่งตั้งอาจารย์ที่ปรึกษา'),
}

const publication = {
  key: 'research-publication',
  title: 'Publish Research Findings (เผยแพร่ผลงานวิจัย)',
  description: null,
  references: form('DGC14', 'แบบแจ้งข้อมูลการเผยแพร่ผลงานวิจัย'),
  prerequisites: ['defense-exam'],
}

const publicationGrant = {
  key: 'publication-support-grant',
  title:
    'Apply for Presentation or Publication Support Grant (ยื่นขอเบิกทุนสนับสนุนการนำเสนอหรือเผยแพร่ผลงานวิจัย)',
  description: bilingualDescription(
    'This may be submitted together with the DGC14 form.',
    'สามารถยื่นพร้อมกับแบบฟอร์ม DGC14 ได้',
  ),
  references: form(
    'DGC02',
    'คำร้องขอเบิกเงินทุนสนับสนุนการนำเสนอหรือเผยแพร่ผลงานวิจัย',
  ),
}

function graduation(_prerequisites, completedSteps) {
  return {
    key: 'graduation',
    title: 'Graduate (ยื่นขอสำเร็จการศึกษา)',
    description: bilingualDescription(
      `After completing all requirements in steps 1–${completedSteps}, students may apply for graduation through the Educational Service System.`,
      `เมื่อดำเนินการครบถ้วนตามขั้นตอนข้อ 1–${completedSteps} แล้ว สามารถยื่นขอสำเร็จการศึกษาผ่านระบบบริการการศึกษา`,
    ),
    references: [registrationUrl],
    prerequisites: [],
  }
}

const masterThesisDefinitions = [
  ethics,
  masterEnglish,
  advisor,
  {
    key: 'proposal-exam',
    title: 'Pass Thesis Proposal Exam (สอบผ่านการสอบโครงร่างวิทยานิพนธ์)',
    description: bilingualDescription(
      "The thesis proposal must be approved within four semesters, counting from the student's first semester of enrollment.",
      'ต้องได้รับอนุมัติโครงร่างวิทยานิพนธ์ภายใน 4 ภาคการศึกษา นับจากภาคการศึกษาแรกที่เข้าศึกษา',
    ),
    references: form('DGC07', 'คำร้องขอสอบโครงร่างวิทยานิพนธ์'),
    prerequisites: ['advisor-appointment'],
  },
  {
    key: 'support-grant',
    title: 'Apply for Thesis Support Grant (ยื่นขอรับทุนสนับสนุนทำวิทยานิพนธ์)',
    description: bilingualDescription(
      'Students must have passed the thesis proposal examination.',
      'ต้องสอบโครงร่างวิทยานิพนธ์ผ่านเรียบร้อยแล้ว',
    ),
    references: form('DGC03', 'คำร้องขอรับทุนสนับสนุนการทำวิทยานิพนธ์'),
    prerequisites: ['proposal-exam'],
  },
  {
    key: 'defense-exam',
    title: 'Pass Thesis Defense Exam (สอบผ่านการสอบป้องกันวิทยานิพนธ์)',
    description: bilingualDescription(
      'Students may apply for the examination at least 90 days after passing the thesis proposal examination and must complete a plagiarism check before applying.',
      'สามารถยื่นขอสอบได้หลังจากสอบผ่านโครงร่างวิทยานิพนธ์มาแล้วไม่น้อยกว่า 90 วัน และต้องตรวจสอบการคัดลอกผลงานทางวิชาการก่อนยื่นขอสอบ',
    ),
    references: form('DGC09', 'คำร้องขอสอบป้องกันวิทยานิพนธ์'),
    prerequisites: ['proposal-exam'],
  },
  {
    key: 'format-checking',
    title: 'Pass Thesis Format Checking (ผ่านการตรวจสอบรูปแบบวิทยานิพนธ์)',
    description: null,
    references: form('DGC11', 'คำร้องขอตรวจสอบรูปแบบวิทยานิพนธ์'),
    prerequisites: ['defense-exam'],
  },
  {
    key: 'complete-file',
    title: 'Submit Complete Thesis File (ส่งไฟล์วิทยานิพนธ์ฉบับสมบูรณ์)',
    description: null,
    references: form('DGC12', 'คำร้องนำส่งไฟล์วิทยานิพนธ์ฉบับสมบูรณ์'),
    prerequisites: ['format-checking'],
  },
  publication,
  publicationGrant,
  graduation(
    [
      'ethics-training',
      'english-proficiency',
      'advisor-appointment',
      'proposal-exam',
      'support-grant',
      'defense-exam',
      'format-checking',
      'complete-file',
      'research-publication',
      'publication-support-grant',
    ],
    10,
  ),
]

const masterIsDefinitions = [
  ethics,
  masterEnglish,
  {
    key: 'comprehensive-exam',
    title: 'Pass Comprehensive Exam (สอบผ่านการสอบประมวลความรู้)',
    description: null,
    references: form('DGC05', 'รายงานผลการสอบประมวลความรู้'),
  },
  advisor,
  {
    key: 'proposal-exam',
    title: 'Pass IS Proposal Exam (สอบผ่านการสอบโครงร่างการค้นคว้าอิสระ)',
    description: null,
    references: form('DGC07', 'คำร้องขอสอบโครงร่างการค้นคว้าอิสระ'),
    prerequisites: ['advisor-appointment'],
  },
  {
    key: 'support-grant',
    title: 'Apply for IS Support Grant (ยื่นขอรับทุนสนับสนุนการค้นคว้าอิสระ)',
    description: bilingualDescription(
      'Students must have passed the independent study proposal examination.',
      'ต้องสอบโครงร่างการค้นคว้าอิสระผ่านเรียบร้อยแล้ว',
    ),
    references: form('DGC03', 'คำร้องขอรับทุนสนับสนุนการค้นคว้าอิสระ'),
    prerequisites: ['proposal-exam'],
  },
  {
    key: 'defense-exam',
    title: 'Pass IS Defense Exam (สอบผ่านการสอบป้องกันการค้นคว้าอิสระ)',
    description: bilingualDescription(
      'Students may apply for the examination at least 90 days after passing the proposal examination and must complete a plagiarism check before applying.',
      'สามารถยื่นขอสอบได้หลังจากสอบผ่านโครงร่างมาแล้วไม่น้อยกว่า 90 วัน และต้องตรวจสอบการคัดลอกผลงานทางวิชาการก่อนยื่นขอสอบ',
    ),
    references: form('DGC09', 'คำร้องขอสอบป้องกันการค้นคว้าอิสระ'),
    prerequisites: ['proposal-exam'],
  },
  {
    key: 'format-checking',
    title: 'Pass IS Format Checking (ผ่านการตรวจสอบรูปแบบการค้นคว้าอิสระ)',
    description: null,
    references: form('DGC11', 'คำร้องขอตรวจสอบรูปแบบการค้นคว้าอิสระ'),
    prerequisites: ['defense-exam'],
  },
  {
    key: 'complete-file',
    title: 'Submit Complete IS File (ส่งไฟล์การค้นคว้าอิสระฉบับสมบูรณ์)',
    description: null,
    references: form('DGC12', 'คำร้องนำส่งไฟล์การค้นคว้าอิสระฉบับสมบูรณ์'),
    prerequisites: ['format-checking'],
  },
  publication,
  publicationGrant,
  graduation(
    [
      'ethics-training',
      'english-proficiency',
      'comprehensive-exam',
      'advisor-appointment',
      'proposal-exam',
      'support-grant',
      'defense-exam',
      'format-checking',
      'complete-file',
      'research-publication',
      'publication-support-grant',
    ],
    11,
  ),
]

const doctoralDefinitions = [
  ethics,
  {
    key: 'english-proficiency',
    title:
      'Submit English Proficiency Test Result (ส่งผลการทดสอบความสามารถทางภาษาอังกฤษ)',
    description: bilingualDescription(
      'Students who have passed the AE1–AE2 courses are not required to submit the DGC24 form.',
      'นักศึกษาที่เรียนผ่านรายวิชา AE1–AE2 แล้ว ไม่จำเป็นต้องยื่นแบบฟอร์ม DGC24',
    ),
    references: form('DGC24', 'แบบยื่นผลการทดสอบความสามารถภาษาอังกฤษ'),
  },
  {
    key: 'qualifying-exam',
    title: 'Pass Qualifying Exam (สอบผ่านการสอบวัดคุณสมบัติ)',
    description: bilingualDescription(
      "Students must take the examination for the first time within four semesters and pass it within six semesters, counting from their first semester of enrollment; otherwise, their student status will be terminated.",
      'ต้องสอบครั้งแรกภายใน 4 ภาคการศึกษา และสอบผ่านภายใน 6 ภาคการศึกษา นับจากภาคการศึกษาแรกที่เข้าศึกษา มิฉะนั้นจะพ้นสถานภาพการเป็นนักศึกษา',
    ),
    references: form('DGC05', 'รายงานผลการสอบวัดคุณสมบัติ (QE)'),
  },
  advisor,
  {
    key: 'proposal-exam',
    title: 'Pass Dissertation Proposal Exam (สอบผ่านการสอบโครงร่างดุษฎีนิพนธ์)',
    description: bilingualDescription(
      "Students must pass the examination and obtain proposal approval within six semesters, counting from their first semester of enrollment.",
      'ต้องสอบผ่านและได้รับอนุมัติโครงร่างภายใน 6 ภาคการศึกษา นับจากภาคการศึกษาแรกที่เข้าศึกษา',
    ),
    references: form('DGC07', 'คำร้องขอสอบโครงร่างดุษฎีนิพนธ์'),
    prerequisites: ['advisor-appointment'],
  },
  {
    key: 'support-grant',
    title:
      'Apply for Dissertation Support Grant (ยื่นขอรับทุนสนับสนุนทำดุษฎีนิพนธ์)',
    description: bilingualDescription(
      'Students must have passed the dissertation proposal examination.',
      'ต้องสอบโครงร่างดุษฎีนิพนธ์ผ่านเรียบร้อยแล้ว',
    ),
    references: form('DGC03', 'คำร้องขอรับทุนสนับสนุนการทำดุษฎีนิพนธ์'),
    prerequisites: ['proposal-exam'],
  },
  {
    key: 'defense-exam',
    title: 'Pass Dissertation Defense Exam (สอบผ่านการสอบป้องกันดุษฎีนิพนธ์)',
    description: bilingualDescription(
      'Students may apply for the examination at least 90 days after passing the proposal examination and must complete a plagiarism check before applying.',
      'สามารถยื่นขอสอบได้หลังจากสอบผ่านโครงร่างมาแล้วไม่น้อยกว่า 90 วัน และต้องตรวจสอบการคัดลอกผลงานทางวิชาการก่อนยื่นขอสอบ',
    ),
    references: form('DGC09', 'คำร้องขอสอบป้องกันดุษฎีนิพนธ์'),
    prerequisites: ['proposal-exam'],
  },
  {
    key: 'format-checking',
    title: 'Pass Dissertation Format Checking (ผ่านการตรวจสอบรูปแบบดุษฎีนิพนธ์)',
    description: null,
    references: form('DGC11', 'คำร้องขอตรวจสอบรูปแบบดุษฎีนิพนธ์'),
    prerequisites: ['defense-exam'],
  },
  {
    key: 'complete-file',
    title: 'Submit Complete Dissertation File (ส่งไฟล์ดุษฎีนิพนธ์ฉบับสมบูรณ์)',
    description: null,
    references: form('DGC12', 'คำร้องนำส่งไฟล์ดุษฎีนิพนธ์ฉบับสมบูรณ์'),
    prerequisites: ['format-checking'],
  },
  publication,
  publicationGrant,
  graduation(
    [
      'ethics-training',
      'english-proficiency',
      'qualifying-exam',
      'advisor-appointment',
      'proposal-exam',
      'support-grant',
      'defense-exam',
      'format-checking',
      'complete-file',
      'research-publication',
      'publication-support-grant',
    ],
    11,
  ),
]

export const defaultMilestoneTemplates = [
  ...createPlanTemplates('master-thesis', 'Master', ['A1', 'A2'], masterThesisDefinitions),
  ...createPlanTemplates('master-is', 'Master', ['B'], masterIsDefinitions),
  ...createPlanTemplates('doctoral', 'Doctoral', ['2.1', '2.2'], doctoralDefinitions),
]
