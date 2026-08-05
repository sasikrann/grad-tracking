import ExcelJS from "exceljs";
import { Readable } from "node:stream";

import { ApiError } from "../errors/api-error.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const degreeLevels = new Set(["Master", "Doctoral"]);
const importRequiredFields = [
  "studentId",
  "fullName",
  "schoolName",
  "program",
  "educationPlan",
  "studentStatus",
];

const studentProgramCodes = {
  1303: "DTT",
  1501: "CE",
};

const studentDegreeCodes = {
  5: "Master",
  7: "Doctoral",
};

const studentSemesterCodes = {
  0: "1",
  5: "2",
};

const headerAliases = {
  studentId: [
    "studentid",
    "student id",
    "student code",
    "student number",
    "id student",
    "รหัสนักศึกษา",
    "รหัสประจำตัวนักศึกษา",
    "เลขประจำตัวนักศึกษา",
    "รหัส นศ.",
  ],
  email: [
    "email",
    "e-mail",
    "email address",
    "student email",
    "student e-mail",
    "อีเมล",
    "อีเมล์",
    "อีเมลนักศึกษา",
    "อีเมล์นักศึกษา",
    "ที่อยู่อีเมล",
    "ที่อยู่อีเมล์",
  ],
  fullName: [
    "fullname",
    "full name",
    "name",
    "student name",
    "student full name",
    "name surname",
    "first name last name",
    "ชื่อ-สกุล",
    "ชื่อ สกุล",
    "ชื่อ-นามสกุล",
    "ชื่อ นามสกุล",
    "ชื่อนามสกุล",
    "ชื่อและนามสกุล",
    "ชื่อสกุล",
    "ชื่อนักศึกษา",
  ],
  schoolName: ["school", "school name", "faculty", "สำนักวิชา"],
  program: ["program", "programme", "major", "สาขาวิชา", "หลักสูตร"],
  educationPlan: [
    "plan",
    "education plan",
    "study plan",
    "student plan",
    "แผนการเรียน",
    "แผนการศึกษา",
    "แผนการเรียนของนักศึกษา",
    "แผน",
  ],
  degreeLevel: ["degreelevel", "degree level", "degree", "ระดับการศึกษา", "ระดับปริญญา"],
  enrollmentAcademicYear: [
    "enrollmentacademicyear",
    "enrollment academic year",
    "admission year",
    "entry year",
    "ปีเข้าศึกษา",
    "ปีการศึกษา",
  ],
  semester: ["semester", "term", "ภาคการศึกษา", "เทอม"],
  expectedGraduationYear: [
    "expectedgraduationyear",
    "expected graduation year",
    "expected year of graduation",
    "graduation year",
    "year",
    "ปีที่คาดว่าจะจบ",
    "ปีที่คาดว่าจบ",
    "ปีคาดว่าจะจบ",
    "ปีคาดว่าจบ",
    "ปีที่คาดว่าจะสำเร็จการศึกษา",
    "ปีการศึกษาที่คาดว่าจะจบ",
    "ปีสำเร็จการศึกษา",
  ],
  advisorId: ["advisorid", "advisor id", "รหัสอาจารย์ที่ปรึกษา"],
  advisorEmail: ["advisoremail", "advisor email", "อีเมลอาจารย์ที่ปรึกษา"],
  advisorName: ["advisorname", "advisor name", "advisor", "อาจารย์ที่ปรึกษา"],
  studentStatus: [
    "status",
    "student status",
    "studentstatus",
    "สถานะ",
    "สถานภาพ",
    "สถานะนักศึกษา",
    "สถานภาพนักศึกษา",
  ],
};

const studentTemplateColumns = [
  { header: "Student ID", key: "studentId", width: 16 },
  { header: "Email", key: "email", width: 32 },
  { header: "Full Name", key: "fullName", width: 28 },
  { header: "Plan", key: "educationPlan", width: 18 },
  { header: "Program", key: "program", width: 18 },
  { header: "Degree Level", key: "degreeLevel", width: 16 },
  { header: "Enrollment Academic Year", key: "enrollmentAcademicYear", width: 25 },
  { header: "Semester", key: "semester", width: 12 },
  { header: "Year", key: "expectedGraduationYear", width: 12 },
];

const studentImportColumns = [
  { header: "Student ID", key: "studentId", width: 16 },
  { header: "Full Name", key: "fullName", width: 28 },
  { header: "School", key: "schoolName", width: 32 },
  { header: "Program", key: "program", width: 18 },
  { header: "Plan", key: "educationPlan", width: 18 },
  { header: "Status", key: "studentStatus", width: 16 },
];

function studentExportColumns(language) {
  return [
    ...studentTemplateColumns,
    { header: "Advisor Name", key: "advisorName", width: 28 },
    {
      header: language === "th" ? "รายงานภาพรวม" : "Milestone Status",
      key: "milestoneStatus",
      width: 80,
    },
  ];
}

function formatMilestoneDate(value, language) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const day = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  const year = date.getUTCFullYear();
  return language === "th"
    ? `${day}/${month}/${String(year + 543).slice(-2)}`
    : `${day}/${month}/${year}`;
}

function formatMilestoneReport(milestones) {
  if (!Array.isArray(milestones)) return "";

  return milestones
    .map((milestone, index) => {
      const status = String(milestone.status ?? "In Progress");
      const completedDate = formatMilestoneDate(
        milestone.reviewedAt || milestone.submittedAt,
        "th",
      );
      let statusText;

      if (["Approved", "Completed"].includes(status)) {
        statusText = completedDate ? `สำเร็จเมื่อ ${completedDate}` : "สำเร็จ";
      } else if (status === "Missing") {
        statusText = "เกินกำหนด";
      } else {
        statusText = "กำลังดำเนินการ";
      }

      return `${index + 1}. ${milestone.title} (${statusText})`;
    })
    .join("\n");
}

function requiredText(value, field) {
  const result = String(value ?? "").trim();
  if (!result) throw new ApiError(400, `${field} is required`);
  return result;
}

function requiredYear(value, field) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 2000 || result > 2200) {
    throw new ApiError(400, `${field} must be a valid year`);
  }
  return result;
}

function optionalEmail(value) {
  const email = normalizeEmailText(value).trim().toLowerCase();
  if (!email) return null;
  if (!emailPattern.test(email)) throw new ApiError(400, "A valid email is required");
  return email;
}

export function normalizeStudent(
  body,
  { studentId, requireEmail = true, requireFullName = true } = {},
) {
  const email = requireEmail
    ? requiredText(normalizeEmailText(body.email), "email").toLowerCase()
    : optionalEmail(body.email);
  const degreeLevel = requiredText(body.degreeLevel, "degreeLevel");
  if (email && !emailPattern.test(email)) throw new ApiError(400, "A valid email is required");
  if (!degreeLevels.has(degreeLevel)) {
    throw new ApiError(400, "degreeLevel must be Master or Doctoral");
  }

  return {
    studentId: studentId || requiredText(body.studentId, "studentId"),
    email,
    fullName: requireFullName
      ? requiredText(body.fullName, "fullName")
      : String(body.fullName ?? "").trim() || null,
    schoolName: String(body.schoolName ?? "").trim() || null,
    program: requiredText(body.program, "program"),
    educationPlan: String(body.educationPlan ?? "").trim() || null,
    degreeLevel,
    enrollmentAcademicYear: requiredYear(body.enrollmentAcademicYear, "enrollmentAcademicYear"),
    semester: requiredText(body.semester, "semester"),
    expectedGraduationYear: requiredYear(
      body.expectedGraduationYear ?? body.year,
      "expectedGraduationYear",
    ),
    advisorId: String(body.advisorId ?? "").trim() || null,
    advisorEmail: optionalEmail(body.advisorEmail),
    advisorName: String(body.advisorName ?? "").trim() || null,
  };
}

function formatImportValidationError(error) {
  if (error.message === "email is required") {
    return "Email is missing. Please enter an email address.";
  }

  return error.message;
}

function missingFieldMessage(field) {
  const messages = {
    studentId: "Student ID is missing.",
    email: "Email is missing.",
    fullName: "Full Name is missing.",
    schoolName: "School Name is missing.",
    program: "Program is missing.",
    degreeLevel: "Degree Level is missing.",
    enrollmentAcademicYear: "Enrollment Academic Year is missing.",
    semester: "Semester is missing.",
    expectedGraduationYear: "Expected Graduation Year is missing.",
    educationPlan: "Education Plan is missing.",
    studentStatus: "Student Status is missing.",
  };

  return messages[field] ?? `${field} is missing.`;
}

function missingFieldLabel(message) {
  return message.replace(/\s+is missing\.$/i, "");
}

function formatMissingFieldsMessage(messages) {
  const labels = messages.map(missingFieldLabel);

  if (labels.length === 0) return "";
  if (labels.length === 1) return `${labels[0]} is missing.`;
  if (labels.length === 2) return `${labels[0]} and ${labels[1]} are missing.`;

  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)} are missing.`;
}

function normalizeCellText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("text" in value) return normalizeCellText(value.text);
    if ("hyperlink" in value) return normalizeCellText(value.hyperlink);
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => normalizeCellText(part.text)).join("");
    }
    if ("result" in value) return normalizeCellText(value.result);
  }
  return String(value).trim();
}

function normalizeEmailText(value) {
  const text = [
    value && typeof value === "object" && "hyperlink" in value ? value.hyperlink : "",
    normalizeCellText(value),
  ]
    .join(" ")
    .replace(/^mailto:/i, "")
    .replace(/\bmailto:/gi, " ")
    .split("?")[0]
    .trim();

  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0] ?? text;
}

function normalizeHeader(value) {
  return normalizeCellText(value)
    .toLowerCase()
    .replace(/[\s_.\-/()]+/g, "");
}

function normalizeImportStudent(rawStudent) {
  const rowErrors = [];

  for (const field of importRequiredFields) {
    if (String(rawStudent[field] ?? "").trim() === "") rowErrors.push(missingFieldMessage(field));
  }

  if (rowErrors.length) {
    throw new ApiError(400, rowErrors.join("; "));
  }

  const derived = parseStudentId(rawStudent.studentId);
  return normalizeStudent(
    {
      ...rawStudent,
      ...derived,
      educationPlan: normalizeEducationPlan(rawStudent.educationPlan, derived.degreeLevel),
      email: String(rawStudent.email ?? "").trim() || `${derived.studentId}@lamduan.mfu.ac.th`,
      expectedGraduationYear:
        String(rawStudent.expectedGraduationYear ?? "").trim() ||
        derived.enrollmentAcademicYear + (derived.degreeLevel === "Doctoral" ? 4 : 3),
    },
    { requireFullName: true },
  );
}

export function normalizeEducationPlan(value, degreeLevel) {
  const plan = String(value ?? "")
    .trim()
    .replace(/๑/g, "1")
    .replace(/๒/g, "2")
    .replace(/\s+/g, "")
    .toUpperCase();

  if (!plan) return null;

  if (degreeLevel === "Master") {
    const masterPlans = {
      A1: "A1",
      "ก.1": "A1",
      ก1: "A1",
      A2: "A2",
      "ก.2": "A2",
      ก2: "A2",
      B: "B",
      ข: "B",
    };
    if (masterPlans[plan]) return masterPlans[plan];
    throw new ApiError(400, "Master education plan must be A1 (ก1), A2 (ก2), or B (ข)");
  }

  if (degreeLevel === "Doctoral") {
    if (["1.1", "2.1", "2.2"].includes(plan)) return plan;
    throw new ApiError(400, "Doctoral education plan must be 1.1, 2.1, or 2.2");
  }

  throw new ApiError(400, "Unsupported degree level for education plan");
}

export function parseStudentId(value) {
  const studentId = String(value ?? "").trim();
  if (!/^\d{10}$/.test(studentId)) {
    throw new ApiError(400, "Student ID must contain exactly 10 digits");
  }

  const entryYear = Number(studentId.slice(0, 2));
  const degreeCode = studentId[2];
  const programCode = studentId.slice(3, 7);
  const semesterCode = studentId[7];
  const degreeLevel = studentDegreeCodes[degreeCode];
  const program = studentProgramCodes[programCode] ?? null;
  let semester = studentSemesterCodes[semesterCode] ?? null;

  if (!degreeLevel) {
    throw new ApiError(400, `Student ID degree code must be 5 (Master) or 7 (Doctoral)`);
  }

  // Accept unknown program codes (we will keep parsed major code instead)
  // Normalize semester: if code '0' means semester 1
  if (!semester) {
    if (semesterCode === "0") semester = "1";
    else if (semesterCode === "5") semester = "2";
    else semester = null;
  }

  return {
    studentId,
    enrollmentAcademicYear: 2500 + entryYear - 543,
    degreeLevel,
    program,
    semester,
    parsedMajorCode: programCode,
  };
}

function cellValue(row, headerMap, names) {
  const key = names.find((name) => headerMap.has(normalizeHeader(name)));
  if (!key) return "";
  const value = row.getCell(headerMap.get(normalizeHeader(key))).value;
  return normalizeCellText(value);
}

function hasMappedHeader(headerMap, names) {
  return names.some((name) => headerMap.has(normalizeHeader(name)));
}

function isNormalStudentStatus(value) {
  const status = normalizeCellText(value)
    .toLowerCase()
    .replace(/[\s_.\-/()]+/g, "");

  return status === "ปกติ" || status === "normal" || status === "active";
}

function addHeaders(worksheet, columns = studentExportColumns) {
  worksheet.columns = columns;
  worksheet.getRow(1).font = { bold: true };
}

export async function readStudentImportFile(file) {
  const workbook = new ExcelJS.Workbook();
  if (file.originalname.toLowerCase().endsWith(".csv")) {
    await workbook.csv.read(Readable.from(file.buffer));
  } else {
    await workbook.xlsx.load(file.buffer);
  }

  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) throw new ApiError(400, "The import file has no student rows");

  const headerMap = new Map();
  sheet.getRow(1).eachCell((cell, column) => {
    headerMap.set(normalizeHeader(cell.value), column);
  });

  const headerTexts = sheet.getRow(1).values.slice(1).map(normalizeCellText).filter(Boolean);
  if (headerTexts.length > 0 && headerTexts.every((header) => /^[?\s_-]+$/.test(header))) {
    throw new ApiError(
      400,
      "The CSV text encoding is corrupted and Thai characters were replaced with ?. Please export or save the original file as UTF-8 CSV and import it again.",
    );
  }

  const records = [];
  const validationErrors = [];
  const missingFieldErrors = new Set();
  const seenIds = new Set();
  const hasStudentStatusColumn = hasMappedHeader(headerMap, headerAliases.studentStatus);
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1 || !row.hasValues) return;
    const studentStatus = cellValue(row, headerMap, headerAliases.studentStatus);
    if (
      hasStudentStatusColumn &&
      studentStatus &&
      !isNormalStudentStatus(studentStatus)
    ) {
      return;
    }
    // Skip duplicate student IDs within the same import file silently (keep first occurrence)
    const candidateId = normalizeCellText(cellValue(row, headerMap, headerAliases.studentId));
    if (candidateId) {
      if (seenIds.has(candidateId)) return;
      seenIds.add(candidateId);
    }
    try {
      records.push(
        normalizeImportStudent({
          studentId: cellValue(row, headerMap, headerAliases.studentId),
          email: cellValue(row, headerMap, headerAliases.email),
          fullName: cellValue(row, headerMap, headerAliases.fullName),
          schoolName: cellValue(row, headerMap, headerAliases.schoolName),
          program: cellValue(row, headerMap, headerAliases.program),
          educationPlan: cellValue(row, headerMap, headerAliases.educationPlan),
          degreeLevel: cellValue(row, headerMap, headerAliases.degreeLevel),
          enrollmentAcademicYear: cellValue(row, headerMap, headerAliases.enrollmentAcademicYear),
          semester: cellValue(row, headerMap, headerAliases.semester),
          expectedGraduationYear: cellValue(row, headerMap, headerAliases.expectedGraduationYear),
          advisorId: cellValue(row, headerMap, headerAliases.advisorId),
          advisorEmail: cellValue(row, headerMap, headerAliases.advisorEmail),
          advisorName: cellValue(row, headerMap, headerAliases.advisorName),
          studentStatus,
        }),
      );
    } catch (error) {
      const message = formatImportValidationError(error);
      const missingMessages = message
        .split(";")
        .map((item) => item.trim())
        .filter((item) =>
          importRequiredFields.some((field) => item === missingFieldMessage(field)),
        );

      if (missingMessages.length) {
        missingMessages.forEach((item) => missingFieldErrors.add(item));
        const otherMessages = message
          .split(";")
          .map((item) => item.trim())
          .filter((item) => !missingMessages.includes(item));
        validationErrors.push(...otherMessages.map((item) => `Row ${rowNumber}: ${item}`));
      } else {
        validationErrors.push(`Row ${rowNumber}: ${message}`);
      }
    }
  });

  const allValidationErrors = [
    formatMissingFieldsMessage([...missingFieldErrors]),
    ...validationErrors,
  ].filter(Boolean);
  if (allValidationErrors.length) {
    throw new ApiError(400, "Please complete all required fields and import the file again.");
  }
  // Previously we errored on duplicate IDs in-file. Per new policy, duplicates in the file
  // should be ignored (we kept the first occurrence). No error raised here.
  // clear seenIds (function-scoped, will be garbage-collected)
  return records;
}

export async function createStudentExportBuffer(students, { language = "en" } = {}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Students");
  addHeaders(worksheet, studentExportColumns(language));
  worksheet.addRows(
    students.map((student) => ({
      ...student,
      milestoneStatus: formatMilestoneReport(student.milestoneReport),
    })),
  );
  const milestoneStatusColumn = worksheet.getColumn("milestoneStatus");
  milestoneStatusColumn.alignment = { vertical: "top", horizontal: "left", wrapText: true };
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const reportCell = row.getCell(milestoneStatusColumn.number);
    reportCell.alignment = { vertical: "top", horizontal: "left", wrapText: true };
    const lineCount = String(reportCell.value ?? "").split("\n").length;
    row.height = Math.min(180, Math.max(30, lineCount * 16));
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function createStudentTemplateBuffer() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Students");
  addHeaders(worksheet, studentImportColumns);
  worksheet.addRow({
    studentId: "6551303009",
    fullName: "Example Student",
    schoolName: "School of Information Technology",
    educationPlan: "A1",
    program: "DTT",
    studentStatus: "Active",
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
