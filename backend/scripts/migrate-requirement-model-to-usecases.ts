/**
 * Migration Script: Chuyển dữ liệu từ requirement_model (embedded trong version) 
 * sang collection usecases độc lập
 * 
 * Chạy script này một lần để migrate dữ liệu hiện có.
 * 
 * Usage:
 *   npx ts-node backend/scripts/migrate-requirement-model-to-usecases.ts
 */

import mongoose from 'mongoose';
import Version from '../internal/model/version';
import Usecase from '../internal/model/usecase';
import { Types } from 'mongoose';

async function migrate() {
  try {
    // Kết nối MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartspec';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Lấy tất cả versions có requirement_model
    const versions = await Version.find({
      requirement_model: { $exists: true, $ne: [] }
    }).lean();

    console.log(`📊 Found ${versions.length} versions with requirement_model`);

    let totalMigrated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const version of versions) {
      try {
        const requirementModel = (version as any).requirement_model || [];
        
        if (!Array.isArray(requirementModel) || requirementModel.length === 0) {
          console.log(`⏭️  Skipping version ${version._id}: no requirement_model`);
          totalSkipped++;
          continue;
        }

        // Kiểm tra xem đã migrate chưa
        const existingUsecases = await Usecase.countDocuments({ version_id: version._id });
        if (existingUsecases > 0) {
          console.log(`⏭️  Skipping version ${version._id}: already migrated (${existingUsecases} usecases)`);
          totalSkipped++;
          continue;
        }

        console.log(`🔄 Migrating version ${version._id}: ${requirementModel.length} usecases`);

        // Chuyển đổi từng usecase
        const usecasesToInsert = requirementModel.map((uc: any) => {
          // Map related_usecases từ string sang ObjectId nếu cần
          let relatedUsecases: Types.ObjectId[] = [];
          if (Array.isArray(uc.related_usecases)) {
            relatedUsecases = uc.related_usecases
              .map((id: any) => {
                if (Types.ObjectId.isValid(id)) {
                  return new Types.ObjectId(id);
                }
                // Nếu là string ID từ requirement_model cũ, cần map lại
                // Tạm thời bỏ qua vì không có mapping table
                return null;
              })
              .filter((id: any) => id !== null) as Types.ObjectId[];
          }

          return {
            project_id: version.project_id,
            version_id: version._id,
            name: uc.name || '',
            role: uc.role || { id: 'role_unknown', name: 'Unknown' },
            goal: uc.goal || '',
            reason: uc.reason || '',
            tasks: Array.isArray(uc.tasks) ? uc.tasks : [],
            inputs: Array.isArray(uc.inputs) ? uc.inputs : [],
            outputs: Array.isArray(uc.outputs) ? uc.outputs : [],
            context: uc.context || '',
            priority: uc.priority || 'medium',
            feedback: uc.feedback || null,
            rules: Array.isArray(uc.rules) ? uc.rules : [],
            triggers: Array.isArray(uc.triggers) ? uc.triggers : [],
            preconditions: Array.isArray(uc.preconditions) ? uc.preconditions : [],
            postconditions: Array.isArray(uc.postconditions) ? uc.postconditions : [],
            exceptions: Array.isArray(uc.exceptions) ? uc.exceptions : [],
            stakeholders: Array.isArray(uc.stakeholders) ? uc.stakeholders : [],
            constraints: Array.isArray(uc.constraints) ? uc.constraints : [],
            related_usecases: relatedUsecases,
            created_by: version.created_by,
            updated_by: uc.updated_by ? new Types.ObjectId(uc.updated_by) : undefined,
            // Giữ nguyên _id nếu có
            _id: uc._id ? new Types.ObjectId(uc._id) : new Types.ObjectId(),
            created_at: uc.created_at || version.created_at || new Date(),
            updated_at: uc.updated_at || version.updated_at || new Date()
          };
        });

        // Insert usecases
        if (usecasesToInsert.length > 0) {
          await Usecase.insertMany(usecasesToInsert, { ordered: false });
          totalMigrated += usecasesToInsert.length;
          console.log(`  ✅ Migrated ${usecasesToInsert.length} usecases for version ${version._id}`);
        }

      } catch (error: any) {
        console.error(`❌ Error migrating version ${version._id}:`, error.message);
        totalErrors++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`  ✅ Total migrated: ${totalMigrated} usecases`);
    console.log(`  ⏭️  Total skipped: ${totalSkipped} versions`);
    console.log(`  ❌ Total errors: ${totalErrors} versions`);

    // Lưu ý: KHÔNG tự động xóa requirement_model để đảm bảo an toàn
    // Bạn có thể xóa thủ công sau khi đã verify dữ liệu:
    // await Version.updateMany({}, { $unset: { requirement_model: "" } });

    console.log('\n⚠️  Lưu ý: requirement_model vẫn còn trong version documents.');
    console.log('   Sau khi verify dữ liệu, bạn có thể xóa bằng:');
    console.log('   await Version.updateMany({}, { $unset: { requirement_model: "" } });');

  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Chạy migration
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export { migrate };

