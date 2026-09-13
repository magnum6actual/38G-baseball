'use client';

import { BuilderProfile } from '@/lib/builder';
import { EditableField } from './EditableField';

interface BaseballCardProps {
  profile: BuilderProfile;
  headshotPreview: string | null;
  onProfileUpdate: (field: keyof BuilderProfile, value: unknown) => void;
  onHeadshotClick: () => void;
}

export function BaseballCard({
  profile,
  headshotPreview,
  onProfileUpdate,
  onHeadshotClick,
}: BaseballCardProps) {
  const updateField = (field: keyof BuilderProfile) => (value: string) => {
    onProfileUpdate(field, value);
  };

  const updateArrayField = (
    field: 'deployments' | 'prior_experience' | 'training_38g' | 'exercises',
    index: number,
    subField: string,
    value: string
  ) => {
    const currentArray = (profile[field] as Array<Record<string, string>>) || [];
    const newArray = [...currentArray];
    while (newArray.length <= index) {
      if (field === 'deployments') {
        newArray.push({ dates: '', mission: '', location: '', position: '' });
      } else if (field === 'prior_experience') {
        newArray.push({ dates: '', location: '', position: '' });
      } else if (field === 'training_38g') {
        newArray.push({ dates: '', course: '' });
      } else if (field === 'exercises') {
        newArray.push({ event: '', position_dates: '' });
      }
    }
    newArray[index] = { ...newArray[index], [subField]: value };
    onProfileUpdate(field, newArray);
  };

  const updateSkill = (index: number, value: string) => {
    const skills = [...(profile.skills || [])];
    while (skills.length <= index) {
      skills.push('');
    }
    skills[index] = value;
    onProfileUpdate('skills', skills);
  };

  const updateLanguage = (
    index: number,
    subField: 'language' | 'listening' | 'reading' | 'speaking',
    value: string
  ) => {
    const languages = [...(profile.languages || [])];
    while (languages.length <= index) {
      languages.push({ language: '', listening: '', reading: '', speaking: '' });
    }
    languages[index] = { ...languages[index], [subField]: value };
    onProfileUpdate('languages', languages);
  };

  return (
    <div className="baseball-card">
      {/* Top Banner */}
      <div className="card-banner">
        <div className="card-banner-warning">
          FOR OFFICIAL USE ONLY - PRIVACY ACT SENSITIVE: Any Misuse or Unauthorized Disclosure of this Information may Result in Both Criminal and Civil Penalties.
        </div>
        <div className="card-banner-row">
          <div className="card-banner-name">
            <EditableField
              value={profile.name || ''}
              onChange={updateField('name')}
              placeholder="Name"
            />
          </div>
          <div className="card-banner-army">US Army</div>
          <div className="card-banner-unit">
            <EditableField
              value={profile.unit || ''}
              onChange={updateField('unit')}
              placeholder="Unit"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="card-main">
        {/* Left Column: Photo + Awards/Credentials */}
        <div className="card-left-column">
          {/* Photo */}
          <div className="card-photo" role="button" tabIndex={0} aria-label="Add or change headshot" onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onHeadshotClick(); } }} onClick={onHeadshotClick}>
            {headshotPreview ? (
              <img src={`data:image/png;base64,${headshotPreview}`} alt="Headshot" />
            ) : (
              <div className="card-photo-placeholder">
                <span>Click to upload photo</span>
              </div>
            )}
          </div>

          {/* Awards Prior */}
          <div className="card-left-section">
            <div className="card-left-header">Awards Prior to this Assignment</div>
            <div className="card-left-content">
              <EditableField
                value={profile.awards_prior || ''}
                onChange={updateField('awards_prior')}
                placeholder="BSM, ARCOM, etc."
                multiline
                rows={2}
              />
            </div>
          </div>

          {/* Awards as 38G */}
          <div className="card-left-section">
            <div className="card-left-header">Awards Received As a 38G</div>
            <div className="card-left-content">
              <EditableField
                value={profile.awards_38g || ''}
                onChange={updateField('awards_38g')}
                placeholder="Awards as 38G"
              />
            </div>
          </div>

          {/* Professional Credentials */}
          <div className="card-left-section">
            <div className="card-left-header">Professional Credentials</div>
            <div className="card-left-content">
              <EditableField
                value={profile.credentials || ''}
                onChange={updateField('credentials')}
                placeholder="Credentials"
              />
            </div>
          </div>

          {/* Civilian Education */}
          <div className="card-left-section">
            <div className="card-left-header">Civilian Education</div>
            <div className="card-left-content">
              <EditableField
                value={profile.education || ''}
                onChange={updateField('education')}
                placeholder="Education"
                multiline
                rows={2}
              />
            </div>
          </div>

          {/* Clearance */}
          <div className="card-left-section">
            <div className="card-left-header">Clearance Level & Expiration</div>
            <div className="card-left-content">
              <div className="card-left-row">
                <span className="card-left-label">Level</span>
                <EditableField
                  value={profile.clearance_level || ''}
                  onChange={updateField('clearance_level')}
                  placeholder=""
                />
              </div>
              <div className="card-left-row">
                <span className="card-left-label">Expiration</span>
                <EditableField
                  value={profile.clearance_exp || ''}
                  onChange={updateField('clearance_exp')}
                  placeholder=""
                />
              </div>
            </div>
          </div>

          {/* Passport Expiration Dates */}
          <div className="card-left-section">
            <div className="card-left-header">Passport Expiration Dates</div>
            <div className="card-left-content">
              <div className="card-left-row">
                <span className="card-left-label">Personal</span>
                <EditableField
                  value={profile.passport_personal || ''}
                  onChange={updateField('passport_personal')}
                  placeholder=""
                />
              </div>
              <div className="card-left-row">
                <span className="card-left-label">Official</span>
                <EditableField
                  value={profile.passport_official || ''}
                  onChange={updateField('passport_official')}
                  placeholder=""
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="card-right-area">
          {/* Profile + Skills + Additional Info Row */}
          <div className="card-top-row">
            {/* Profile Section */}
            <div className="card-profile-section">
              <div className="card-profile-header">Profile</div>
              <div className="card-profile-fields">
                <div className="card-profile-row">
                  <span className="card-profile-label">Rank:</span>
                  <EditableField
                    value={profile.rank || ''}
                    onChange={updateField('rank')}
                    placeholder="Rank"
                  />
                </div>
                <div className="card-profile-row">
                  <span className="card-profile-label">Date Assigned to Unit:</span>
                  <EditableField
                    value={profile.date_assigned || ''}
                    onChange={updateField('date_assigned')}
                    placeholder="DD MMM YYYY"
                  />
                </div>
                <div className="card-profile-row">
                  <span className="card-profile-label">Position Title:</span>
                  <EditableField
                    value={profile.position_title || ''}
                    onChange={updateField('position_title')}
                    placeholder="Position"
                  />
                </div>
                <div className="card-profile-row">
                  <span className="card-profile-label">MOS/Branch/Skill:</span>
                  <EditableField
                    value={profile.mos_skill || ''}
                    onChange={updateField('mos_skill')}
                    placeholder="38G-XX"
                  />
                </div>
                <div className="card-profile-row">
                  <span className="card-profile-label">Skill (Plain English):</span>
                  <EditableField
                    value={profile.skill_plain || ''}
                    onChange={updateField('skill_plain')}
                    placeholder="Skill"
                  />
                </div>
                <div className="card-profile-row">
                  <span className="card-profile-label">Residence Location:</span>
                  <EditableField
                    value={profile.residence || ''}
                    onChange={updateField('residence')}
                    placeholder="City, State"
                  />
                </div>
                <div className="card-profile-row">
                  <span className="card-profile-label">Civilian Occupation:</span>
                  <EditableField
                    value={profile.civilian_occupation || ''}
                    onChange={updateField('civilian_occupation')}
                    placeholder="Occupation"
                  />
                </div>
              </div>

              {/* Skills Grid */}
              <div className="card-skills-section">
                <div className="card-skills-header">Military & Civilian Skills</div>
                <div className="card-skills-grid">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <div key={i} className="card-skill-cell">
                      <EditableField
                        value={profile.skills?.[i] || ''}
                        onChange={(val) => updateSkill(i, val)}
                        placeholder=""
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="card-additional-section">
              <div className="card-additional-header">Additional Information</div>
              <div className="card-additional-content">
                <EditableField
                  value={profile.additional_info || ''}
                  onChange={updateField('additional_info')}
                  placeholder="Brief narrative (~200 words)"
                  multiline
                  rows={10}
                />
              </div>
              <div className="card-freeform-label">
                Freeform Text: Anything you want Leadership & Supported Customers to know...
              </div>
            </div>
          </div>

          {/* Mission/Exercise Deployment History */}
          <div className="card-table-section">
            <div className="card-table-header">Mission/Exercise Deployment History</div>
            <table className="card-table">
              <thead>
                <tr>
                  <th>Dates (Required - Recommended)</th>
                  <th>Mission</th>
                  <th>Location</th>
                  <th>Position</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td>
                      <EditableField
                        value={profile.deployments?.[i]?.dates || ''}
                        onChange={(val) => updateArrayField('deployments', i, 'dates', val)}
                        placeholder=""
                      />
                    </td>
                    <td>
                      <EditableField
                        value={profile.deployments?.[i]?.mission || ''}
                        onChange={(val) => updateArrayField('deployments', i, 'mission', val)}
                        placeholder=""
                      />
                    </td>
                    <td>
                      <EditableField
                        value={profile.deployments?.[i]?.location || ''}
                        onChange={(val) => updateArrayField('deployments', i, 'location', val)}
                        placeholder=""
                      />
                    </td>
                    <td>
                      <EditableField
                        value={profile.deployments?.[i]?.position || ''}
                        onChange={(val) => updateArrayField('deployments', i, 'position', val)}
                        placeholder=""
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Prior Deployments/Staff Experience */}
          <div className="card-table-section">
            <div className="card-table-header">Prior Deployments/Staff Experience/Civilian Experience - Relevant to Employability</div>
            <table className="card-table">
              <thead>
                <tr>
                  <th>Dates (Required - Returned Mil/Civ)</th>
                  <th>Assigned To/Location</th>
                  <th>Position</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td>
                      <EditableField
                        value={profile.prior_experience?.[i]?.dates || ''}
                        onChange={(val) => updateArrayField('prior_experience', i, 'dates', val)}
                        placeholder=""
                      />
                    </td>
                    <td>
                      <EditableField
                        value={profile.prior_experience?.[i]?.location || ''}
                        onChange={(val) => updateArrayField('prior_experience', i, 'location', val)}
                        placeholder=""
                      />
                    </td>
                    <td>
                      <EditableField
                        value={profile.prior_experience?.[i]?.position || ''}
                        onChange={(val) => updateArrayField('prior_experience', i, 'position', val)}
                        placeholder=""
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Row: Training + Exercises side by side */}
          <div className="card-bottom-row">
            {/* 38G Training */}
            <div className="card-bottom-table">
              <div className="card-table-header">38G Related Formal Training</div>
              <table className="card-table">
                <thead>
                  <tr>
                    <th>Dates (Start - Complete)</th>
                    <th>Course</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td>
                        <EditableField
                          value={profile.training_38g?.[i]?.dates || ''}
                          onChange={(val) => updateArrayField('training_38g', i, 'dates', val)}
                          placeholder=""
                        />
                      </td>
                      <td>
                        <EditableField
                          value={profile.training_38g?.[i]?.course || ''}
                          onChange={(val) => updateArrayField('training_38g', i, 'course', val)}
                          placeholder=""
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Exercise Participation */}
            <div className="card-bottom-table">
              <div className="card-table-header">Exercise Participation History</div>
              <table className="card-table">
                <thead>
                  <tr>
                    <th>Exercise / Event</th>
                    <th>Position / Dates</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td>
                        <EditableField
                          value={profile.exercises?.[i]?.event || ''}
                          onChange={(val) => updateArrayField('exercises', i, 'event', val)}
                          placeholder=""
                        />
                      </td>
                      <td>
                        <EditableField
                          value={profile.exercises?.[i]?.position_dates || ''}
                          onChange={(val) => updateArrayField('exercises', i, 'position_dates', val)}
                          placeholder=""
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Languages & Proficiency */}
          <div className="card-table-section">
            <div className="card-table-header">Languages & Proficiency</div>
            <table className="card-table">
              <thead>
                <tr>
                  <th>Language</th>
                  <th>Listening</th>
                  <th>Reading</th>
                  <th>Speaking</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td>
                      <EditableField
                        value={profile.languages?.[i]?.language || ''}
                        onChange={(val) => updateLanguage(i, 'language', val)}
                        placeholder=""
                      />
                    </td>
                    <td>
                      <EditableField
                        value={profile.languages?.[i]?.listening || ''}
                        onChange={(val) => updateLanguage(i, 'listening', val)}
                        placeholder=""
                      />
                    </td>
                    <td>
                      <EditableField
                        value={profile.languages?.[i]?.reading || ''}
                        onChange={(val) => updateLanguage(i, 'reading', val)}
                        placeholder=""
                      />
                    </td>
                    <td>
                      <EditableField
                        value={profile.languages?.[i]?.speaking || ''}
                        onChange={(val) => updateLanguage(i, 'speaking', val)}
                        placeholder=""
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
