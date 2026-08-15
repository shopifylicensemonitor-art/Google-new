# Google-new Patch Files & Development Scripts Reference

This document describes the patch files and utility scripts in Google-new. These are incremental improvements that have been made to various components.

---

## 📋 Patch Files Summary

### Frontend/UI Patches

#### 1. **patch_campaigns.js**
- **Target**: `gfg-main/src/pages/Campaigns.tsx`
- **Purpose**: Add HTML preview feature to campaign creation
- **Changes**:
  - Adds `showPreview` state
  - Imports `Eye` icon from lucide-react
  - Adds toggle button to show/hide HTML preview
  - Splits textarea layout into grid (editor + preview)

#### 2. **patch_campaigns_header.js**
- **Target**: Campaign header component
- **Purpose**: Header/layout improvements

#### 3. **patch_campaigns_steps.js**
- **Target**: Campaign steps workflow
- **Purpose**: UI/UX improvements for campaign creation flow

#### 4. **patch_campaign_create.js**
- **Target**: Campaign creation form
- **Purpose**: Form validation and user experience enhancements

#### 5. **patch_campaign_routes.js** & **patch_campaign_routes2.js**
- **Target**: Campaign routing
- **Purpose**: API route improvements

---

### Dashboard/Analytics Patches

#### 6. **patch_dashboard.js** & **patch_dashboard2.js**
- **Target**: `app.js` dashboard endpoint
- **Purpose**: Adds 7-day activity chart to dashboard
- **Changes**:
  - Calculates sent/failed emails by day
  - Returns `chartData` in dashboard response
  - Groups logs by date for analytics

#### 7. **patch_dashboard_activity.js**
- **Target**: Activity component
- **Purpose**: Activity tracking improvements

#### 8. **patch_dashboard_feed.js** & **patch_dashboard_feed2.js**
- **Target**: Dashboard feed component
- **Purpose**: Email feed display improvements

#### 9. **patch_dashboard_logs.js** & **patch_dashboard_recent_logs.js**
- **Target**: Log display components
- **Purpose**: Log filtering and display enhancements

#### 10. **patch_dashboard_toast.js**
- **Target**: Toast notifications
- **Purpose**: Notification styling and behavior

---

### API & Core Patches

#### 11. **patch_api_ts.js**
- **Target**: `gfg-main/src/api.ts`
- **Purpose**: TypeScript API definitions

#### 12. **patch_api_campaign.js**
- **Target**: Campaign API types
- **Purpose**: Adds `trigger_event?: string` to CampaignStep interface
- **Changes**:
  - Updates TypeScript interface
  - Allows campaigns to trigger on events

#### 13. **patch_db.js**
- **Target**: `db.js`
- **Purpose**: Database improvements

---

### Email/Inbox Patches

#### 14. **patch_inbox.js** & **patch_inbox_sentiment.js**
- **Target**: Inbox components
- **Purpose**: Email inbox improvements and sentiment analysis

#### 15. **patch_settings_theme.js**
- **Target**: User theme settings
- **Purpose**: Theme/styling enhancements

---

### Application Configuration Patches

#### 16. **patch_app_days.js**
- **Target**: App day/date handling
- **Purpose**: Date calculation improvements

#### 17. **patch_app.js**
- **Target**: `app.js` main application file
- **Purpose**: Various core application improvements

---

## 🛠️ Utility & Fix Scripts

### **fix_import.js**
- **Purpose**: Fixes import statement issues
- **Use Case**: Resolves module import problems

### **fix_import_campaigns.js**
- **Purpose**: Fixes campaign-specific import issues
- **Use Case**: Resolves campaign module imports

### **inject_workflow.js**
- **Purpose**: Injects workflow automation
- **Use Case**: Adds workflow definitions or automations

---

## 📊 Test Scripts

### Test Files in Google-new

```
test_phase2_email_verification.js    # Phase 2: Email verification testing
test_phase3_password_strength.js     # Phase 3: Password strength validation
test_phase5_api.js                   # Phase 5: Full API testing
test_queue.js                        # Queue processing tests
test_logs.js                         # Logging functionality tests
test_backend_campaign_api.ps1        # PowerShell tests for campaign API
```

---

## 🚀 How to Apply Patches

### Option 1: Apply All Patches (Automatic)
```bash
# Run all patches
node patch_campaigns.js
node patch_dashboard.js
node patch_dashboard_activity.js
# ... continue with others
```

### Option 2: Apply Specific Patches
```bash
# Apply only the dashboard patch
node patch_dashboard.js

# Apply only the campaigns patch
node patch_campaigns.js
```

### Option 3: Manual Review & Apply
```bash
# Review a patch before applying
cat patch_campaigns.js

# Apply if approved
node patch_campaigns.js
```

---

## ⚠️ Important Notes

1. **Patch Order**: Some patches may depend on others
   - Apply database patches first
   - Then apply API patches
   - Finally apply UI patches

2. **Backup Before Patching**:
   ```bash
   git add .
   git commit -m "Backup before patching"
   ```

3. **Testing After Patching**:
   ```bash
   npm run test            # Run all tests
   npm run test:security   # Run security tests
   npm run lint            # Run linter
   npm run frontend:dev    # Start dev server
   ```

4. **Bun vs npm**:
   - These patches use Node.js `fs` module
   - Should work with both npm and bun
   - Test after applying

---

## 📋 Patch Application Checklist

- [ ] Back up current code (git commit)
- [ ] Review each patch file
- [ ] Apply patches in order (DB → API → UI)
- [ ] Run tests after each patch
- [ ] Test UI functionality
- [ ] Run linter
- [ ] Test email functionality
- [ ] Verify dashboard charts
- [ ] Verify campaign creation
- [ ] Commit changes

---

## 🔄 Merging with gfg-main

### Current State
- **gfg-main**: Clean production version (no patches)
- **Google-new**: Development version with patches

### To Merge Improvements
1. Apply desired patches in Google-new
2. Test thoroughly
3. If successful, apply same changes to gfg-main
4. Or copy the entire patched version to gfg-main

### Recommended Approach
```bash
# 1. Apply patches to Google-new
node patch_dashboard.js
node patch_campaigns.js
# ... apply others

# 2. Test thoroughly
npm run test
npm run frontend:dev

# 3. Verify changes work
# ... manual testing

# 4. If all good, copy improvements to gfg-main
cp -r Google-new/* gfg-main/
cd gfg-main
npm install
npm run test
```

---

## 🎯 Recommended Patches for Production

**High Priority (Recommended)**:
- `patch_dashboard.js` — Adds analytics chart
- `patch_campaigns.js` — Adds HTML preview

**Medium Priority (Nice to have)**:
- `patch_api_campaign.js` — Adds event triggers
- `patch_dashboard_logs.js` — Improves log display

**Low Priority (Optional)**:
- `patch_settings_theme.js` — Theme improvements
- `patch_dashboard_activity.js` — Activity tracking

---

## 📞 Need Help?

If a patch fails:
1. Check git status: `git status`
2. Revert: `git checkout -- .`
3. Review the patch file
4. Check if dependencies are installed
5. Test manually: `npm run frontend:dev`
