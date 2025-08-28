1. Use Case Diagram
Cần các trường:
name (tên use case, ngắn gọn)
role (actor)
(optionally) goal (mục tiêu, để mô tả chi tiết hơn)
(optionally) triggers, rules (nếu muốn thể hiện quan hệ hoặc điều kiện)
Giải thích:
Diagram này chủ yếu thể hiện các use case (oval) và các actor (người/vai trò), cùng quan hệ giữa chúng.

2. Activity Diagram
Cần các trường:
tasks (các bước thực hiện, chính là các activity)
name hoặc goal (để đặt tên cho activity chính)
(optionally) inputs, outputs (nếu muốn thể hiện dữ liệu vào/ra)
(optionally) rules, triggers (điều kiện rẽ nhánh, bắt đầu/kết thúc)
Giải thích:
Diagram này mô tả luồng công việc (workflow) của một use case, từng bước (activity) và điều kiện chuyển bước.

3. Sequence Diagram
Cần các trường:
role (actor, đối tượng khởi tạo tương tác)
tasks (các bước, mỗi bước có thể là một message/interaction)
(optionally) inputs, outputs (dữ liệu truyền qua lại)
(optionally) goal (để mô tả mục tiêu của sequence)
Giải thích:
Diagram này mô tả thứ tự các tương tác (message) giữa các actor và hệ thống/đối tượng.

4. Đề xuất Database (DB Design)
Cần các trường:
inputs (dữ liệu đầu vào, gợi ý các trường cần lưu)
outputs (dữ liệu đầu ra, gợi ý các trường cần truy xuất)
name hoặc goal (để đặt tên bảng/collection)
(optionally) context, rules (ràng buộc, quan hệ, điều kiện dữ liệu)
Giải thích:
Dùng để xác định các bảng, trường dữ liệu, quan hệ giữa các bảng dựa trên thông tin nghiệp vụ.

5. Testcase
Cần các trường:
name hoặc goal (tên testcase, mô tả mục tiêu kiểm thử)
tasks (các bước thực hiện testcase)
inputs (dữ liệu đầu vào cho testcase)
outputs (kết quả mong đợi)
(optionally) rules (điều kiện kiểm thử, ràng buộc)
(optionally) priority, feedback (ưu tiên kiểm thử, ghi chú)
Giải thích:
Testcase cần biết mình kiểm thử cái gì, các bước thực hiện, dữ liệu vào/ra, điều kiện thành công/thất bại.


Tóm tắt bảng trường dữ liệu cần thiết
Đầu ra	            name/goal	role	tasks	inputs	outputs	 rules	triggers	context	 priority	feedback	reason
Use Case Diagram	   ✔	     ✔				                  *	      *				
Activity Diagram	   ✔	             ✔	      *	      *	      *	      *				
Sequence Diagram	   ✔	     ✔      ✔         *	      *						
Đề xuất DB	           ✔			               ✔	  ✔	      *		              *			
Testcase	           ✔		         ✔	      ✔	      ✔	     *			                   *	     *	

- Bắt buộc: ✔
- Optional: *