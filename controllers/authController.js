const { prisma } = require('../lib/db')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'replace_this_with_a_secret'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

// 1. Parent Register/Login via Phone (Auto-Registration)
exports.phoneLogin = async function (req, res, next) {
  try {
    const { phone, language, role, division, district, upazila } = req.body

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' })
    }

    let parent = await prisma.parent.findUnique({
      where: { phone }
    })

    if (parent) {
      // Update existing parent if details are provided
      const updateData = {}
      if (language) updateData.language = language
      if (role) updateData.role = role
      if (division) updateData.division = division
      if (district) updateData.district = district
      if (upazila) updateData.upazila = upazila

      if (Object.keys(updateData).length > 0) {
        parent = await prisma.parent.update({
          where: { id: parent.id },
          data: updateData
        })
      }
    } else {
      // Create new parent (Auto-Registration)
      parent = await prisma.parent.create({
        data: {
          phone,
          language: language || 'bn',
          role: role || 'parent',
          division: division || null,
          district: district || null,
          upazila: upazila || null,
        }
      })
    }

    const token = jwt.sign(
      { sub: parent.id, role: parent.role, phone: parent.phone },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    res.status(200).json({
      token,
      parent: {
        id: parent.id,
        phone: parent.phone,
        language: parent.language,
        role: parent.role,
        division: parent.division,
        district: parent.district,
        upazila: parent.upazila
      }
    })
  } catch (err) {
    next(err)
  }
}

// 2. Facility Admin Login (Email + PIN)
exports.adminLogin = async function (req, res, next) {
  try {
    const { email, pin } = req.body

    if (!email || !pin) {
      return res.status(400).json({ message: 'Email and PIN are required' })
    }

    const admin = await prisma.facilityAdmin.findUnique({
      where: { email },
      include: { facility: true }
    })

    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const isMatch = await bcrypt.compare(pin, admin.pinHash)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Update last login timestamp
    await prisma.facilityAdmin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() }
    })

    const token = jwt.sign(
      { sub: admin.id, role: 'admin', email: admin.email, facilityId: admin.facilityId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    res.status(200).json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        facilityId: admin.facilityId,
        facilityName: admin.facility.name
      }
    })
  } catch (err) {
    next(err)
  }
}

// 3. Register Facility Admin (Helper route for setup/testing)
exports.adminRegister = async function (req, res, next) {
  try {
    const { email, pin, facilityId } = req.body

    if (!email || !pin || !facilityId) {
      return res.status(400).json({ message: 'Email, PIN and facilityId are required' })
    }

    // Verify facility exists
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId }
    })
    if (!facility) {
      return res.status(404).json({ message: 'Facility not found' })
    }

    const pinString = String(pin)
    if (pinString.length < 4 || pinString.length > 6) {
      return res.status(400).json({ message: 'PIN must be between 4 and 6 digits' })
    }

    // Encrypt PIN
    const pinHash = await bcrypt.hash(pinString, 10)

    const admin = await prisma.facilityAdmin.create({
      data: {
        email,
        pinHash,
        facilityId
      }
    })

    res.status(201).json({
      message: 'Facility admin registered successfully',
      admin: {
        id: admin.id,
        email: admin.email,
        facilityId: admin.facilityId
      }
    })
  } catch (err) {
    next(err)
  }
}
