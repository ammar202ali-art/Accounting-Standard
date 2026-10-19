CREATE TYPE public.app_role AS ENUM ('admin', 'editor');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','editor'))
$$;

CREATE POLICY "Own profile or admins read profiles" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Own roles or admins read roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins grant roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins revoke roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND user_id <> auth.uid());

-- New users get a profile; the very first user becomes the admin.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, COALESCE(NEW.email, ''));
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.jobs (
  id serial PRIMARY KEY,
  title text NOT NULL,
  company text NOT NULL,
  location text NOT NULL,
  role text NOT NULL,
  employment_type text NOT NULL,
  experience text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  details text NOT NULL DEFAULT '',
  description text[] NOT NULL DEFAULT '{}',
  responsibilities text[] NOT NULL DEFAULT '{}',
  qualifications text[] NOT NULL DEFAULT '{}',
  apply_docs text[] NOT NULL DEFAULT '{}',
  apply_email text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.jobs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.jobs_id_seq TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads published jobs" ON public.jobs FOR SELECT TO anon, authenticated
  USING (published OR public.is_staff(auth.uid()));
CREATE POLICY "Staff add jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff edit jobs" ON public.jobs FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete jobs" ON public.jobs FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TABLE public.site_content (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_content TO anon;
GRANT SELECT, INSERT, UPDATE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads site text" ON public.site_content FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Staff add site text" ON public.site_content FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff edit site text" ON public.site_content FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER jobs_touch BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER site_content_touch BEFORE UPDATE ON public.site_content FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.site_content (key, value) VALUES
('home_tagline', 'معرفة أعمق. مستقبل أوضح.'),
('home_intro', 'منصتك المتخصصة في المحاسبة والمعايير الدولية.
مقالات عملية وفرص مهنية، لكل خطوة في مسيرتك.'),
('home_cta_title', 'استثمر في معرفتك، كل يوم.'),
('home_cta_text', 'محتوى متخصص يواكب تطلعاتك المهنية.'),
('about_title', 'محاسبون. معرفة تُلهم، مسيرة تتطور.'),
('about_subtitle', 'مساحة عربية للمعرفة المحاسبية والطموح المهني.'),
('about_body', '## المعرفة أساس كل خطوة ناجحة
نؤمن بأن المحاسبة أكثر من أرقام. إنها فهم للأعمال، وقراءة للمستقبل، وأداة لاتخاذ قرارات أفضل. تجمع محاسبون المقالات المتخصصة والموضوعات العملية في مساحة واضحة ومتاحة.

## من المعرفة إلى الفرصة
من المعايير الدولية والضرائب إلى التحليل المالي والتكنولوجيا، نركز على الموضوعات التي تهم المحاسب في مسيرته. وتفتح مساحة الوظائف نافذة على الخطوات المهنية المقبلة.

المحتوى تعليمي ولا يغني عن الرجوع إلى المصادر الرسمية أو الاستشارة المهنية.'),
('footer_text', 'مساحتك للمعرفة المحاسبية والتطور المهني.
نقرّب إليك المعرفة، ونفتح أمامك آفاقًا جديدة.');

INSERT INTO public.jobs (id, title, company, location, role, employment_type, experience, tags, details, description, responsibilities, qualifications, apply_docs, apply_email) VALUES
(1,'محاسب مالي أول','شركة الابتكار المالي الدولية','الرياض','محاسب','دوام كامل','5–7 سنوات',ARRAY['IFRS','SAP','التحليل المالي']::text[],'إعداد القوائم المالية والتقارير الدورية، وتحليل الأداء المالي ومتابعة العمليات المحاسبية وفق المعايير الدولية.',ARRAY['محاسب مالي أول يتولى دورة التقارير المالية كاملة: من اعتماد المعالجة المحاسبية للعمليات اليومية حتى إصدار القوائم المالية الدورية وفق المعايير الدولية.','تعمل ضمن فريق مالي من أربعة أشخاص يعتمد نظام SAP، وتتعاون مع وحدات العمليات والتدقيق الداخلي لتأمين بيانات دقيقة وجاهزة للإفصاح في مواعيدها.']::text[],ARRAY['اعتماد القيود اليومية ومراجعة المعالجة المحاسبية للعمليات قبل ترحيلها.','إقفال الحسابات الشهرية وإعداد ميزان المراجعة والتقارير الدورية للإدارة.','إعداد القوائم المالية وفق IFRS مع ملاحظات الإفصاح المرافقة لها.','متابعة مطابقات الأرصدة البنكية والحسابات الجارية ومعالجة الفروقات.']::text[],ARRAY['بكالوريوس محاسبة، ويفضل شهادة مهنية مثل SOCPA أو CMA أو ACCA.','خبرة عملية من 5 إلى 7 سنوات في المحاسبة المالية، ويفضل في بيئة متعددة الفروع.','إتقان المعايير الدولية وتطبيقات SAP المالية، مع مستوى متقدم في Excel.','التزام بمواعيد الإقفال والقدرة على مراجعة عمل فريق صغير.']::text[],ARRAY['سيرة ذاتية محدّثة مع نبذة عن آخر منصب.','نسخة من المؤهل العلمي والشهادة المهنية إن وجدت.','رقم العضوية المهنية أو نتيجة الاختبار الأحدث.']::text[],'careers@albtakar.example'),
(2,'مدير محاسبة','مجموعة التطوير التجاري','جدة','مدير محاسبة','دوام كامل','8–10 سنوات',ARRAY['CPA / CMA','Oracle','قيادة الفرق']::text[],'قيادة فريق المحاسبة والإشراف على الإقفال المالي وتطوير الإجراءات، مع خبرة في التخطيط الاستراتيجي.',ARRAY['مدير محاسبة يقود فريقًا من سبعة محاسبين ويشرف على دورة الإقفال الشهرية والربع سنوية والسنة المالية، ويضمن أن التقارير التي تصل إلى الإدارة والمراجع موثوقة وفي وقتها.','يشارك المنصب في وضع الموازنة وتطوير الإجراءات الداخلية، ويعمل على أتمتة جزء من دورة الفواتير ضمن خطة التحول الرقمي للمجموعة.']::text[],ARRAY['قيادة فريق المحاسبة وتوزيع المهام ومراجعة جودة المخرجات.','إدارة دورة الإقفال الشهرية والسنوية واعتماد التسويات والقيود التصحيحية.','إعداد الموازنة السنوية ومقارنة الفعلي بالمتوقع وشرح الفروقات للإدارة.','تطوير الإجراءات وضوابط الرقابة الداخلية والتعاون مع المراجع الخارجي.']::text[],ARRAY['بكالوريوس محاسبة مع شهادة مهنية معتمدة (CPA أو CMA أو ما يعادلها).','خبرة 8 إلى 10 سنوات في المحاسبة، منها 3 سنوات على الأقل في قيادة فريق.','إتقان نظام Oracle المالي وخبرة في إعداد الموازنات والتقارير الموحدة.','مهارات تواصل وقدرة على تمثيل الإدارة أمام المراجعين والجهات الرسمية.']::text[],ARRAY['سيرة ذاتية محدّثة توضح حجم الفريق الذي قُدتم.','نسخة من المؤهل والشهادة المهنية.','نبذة عن مبادرة تطوير أو أتمتة قدتم بها.']::text[],'jobs@tatweer-group.example'),
(3,'محاسب ضرائب','مكتب الاستشارات الضريبية المتقدمة','الدمام','مستشار ضريبي','دوام كامل','3–5 سنوات',ARRAY['ضريبة القيمة المضافة','الزكاة','الاستشارات']::text[],'إعداد الإقرارات الضريبية ومراجعة الامتثال وتقديم الاستشارات المتعلقة بالزكاة وضريبة الدخل والقيمة المضافة.',ARRAY['محاسب ضرائب يخدم عملاء المكتب من قطاعات التجارة والخدمات، ويتولى إعداد إقرارات ضريبة القيمة المضافة والزكاة ومراجعتها قبل تقديمها للجهات المختصة.','يحتاج الدور إلى دقة في التوثيق وحسن صياغة للمذكرات الضريبية، مع متابعة مستمرة لتحديثات الأنظمة واللوائح التنفيذية.']::text[],ARRAY['إعداد إقرارات ضريبة القيمة المضافة والزكاة ومطابقتها مع السجلات المحاسبية.','مراجعة فواتير العملاء والموردين للتأكد من صحة المعالجة الضريبية.','إعداد مذكرات الاستشارة الضريبية والرد على استفسارات العملاء.','متابعة تحديثات الأنظمة واحتفظ بسجل تدقيق لكل إقرار مقدم.']::text[],ARRAY['بكالوريوس محاسبة أو قانون، ويفضل دبلوم ضرائب أو شهادة مهنية متخصصة.','خبرة 3 إلى 5 سنوات في الإقرارات الضريبية أو الاستشارات الضريبية.','إلمام بنظام ضريبة القيمة المضافة واللائحة التنفيذية والزكاة في السعودية.','دقة في التوثيق وقدرة على صياغة مذكرات مهنية واضحة.']::text[],ARRAY['سيرة ذاتية محدّثة.','نسخة من المؤهل العلمي أو الشهادة المتخصصة.','أمثلة على أعمال ضريبية سابقة (بدون بيانات عملاء).']::text[],'hiring@mtaqaddim.example'),
(4,'محلل مالي','البنك الوطني للاستثمار','الرياض','محلل مالي','دوام كامل','2–4 سنوات',ARRAY['CFA','Excel','تحليل البيانات']::text[],'تحليل البيانات المالية وإعداد التقارير ونماذج التوقعات المالية لدعم قرارات الإدارة والاستثمار.',ARRAY['محلل مالي يدعم وحدة الاستثمار والتحليل بتقارير دورية عن أداء المحافظ والقطاعات، وبنماذج تقدير تشرح أثر الفرضيات على النتائج.','تقوم الوحدة على العمل الجماعي بين التحليل وإدارة المخاطر، لذلك يحتاج الدور إلى فهم محاسبي متين مع قدرة جيدة على عرض النتائج.']::text[],ARRAY['إعداد التقارير المالية الدورية وملخصات الأداء للقطاعات والمحافظ.','بناء نماذج تقدير مالي بسيطة وتحليل حساسية الفرضيات.','تحديث بيانات السوق والمقارنات مع الشركات المماثلة.','دعم إدارة المخاطر في مراجعة الافتراضات وتوثيقها.']::text[],ARRAY['بكالوريوس مالية أو محاسبة، ويفضل بدء اختبار CFA.','خبرة 2 إلى 4 سنوات في التحليل المالي أو تقييم الشركات.','تمكين متقدم في Excel وبناء النماذج، ويفضل Power BI.','قدرة على تحويل الأرقام إلى توصيات مكتوبة مختصرة.']::text[],ARRAY['سيرة ذاتية محدّثة.','نسخة من المؤهل العلمي ونتائج CFA إن وجدت.','نموذج تحليل أو تقرير من إعدادك (بدون بيانات سرية).']::text[],'careers@nati.example'),
(5,'مدقق داخلي','شركة الأفق للمراجعة والخدمات المهنية','الرياض','مدقق','دوام كامل','3–5 سنوات',ARRAY['المراجعة الداخلية','SOX','إدارة المخاطر']::text[],'تقييم الضوابط الداخلية وتنفيذ خطط المراجعة وكتابة تقارير الملاحظات ومتابعة تنفيذ التوصيات.',ARRAY['مدقق داخلي ينفذ خطة المراجعة السنوية على العمليات المالية والتشغيلية، ويقيس فاعلية الضوابط الداخلية ويوثق الملاحظات بأدلة كافية.','يشمل الدور متابعة تنفيذ التوصيات مع الجهات المالكة للإجراء، وإعداد تقارير واضحة للإدارة ولجنة المراجعة.']::text[],ARRAY['تنفيذ مهام المراجعة الميدانية وتوثيق الإجراءات والأدلة في ملفات المراجعة.','تقييم فاعلية الضوابط الداخلية وتحديد الثغرات وأثرها المحتمل.','كتابة تقارير الملاحظات مع توصيات قابلة للتنفيذ ومدد محددة.','متابعة إغلاق الملاحظات والتأكد من كفاية الإجراءات التصحيحية.']::text[],ARRAY['بكالوريوس محاسبة أو إدارة، ويفضل شهادة CIA أو CPA.','خبرة 3 إلى 5 سنوات في المراجعة الداخلية أو الخارجية.','إلمام بإطار الضوابط الداخلية COSO ومتطلبات SOX.','قدرة على التوثيق والكتابة المهنية والحوار مع الجهات المراجعة.']::text[],ARRAY['سيرة ذاتية محدّثة.','نسخة من المؤهل والشهادة المهنية.','نبذة عن مهمة مراجعة شاركت في إغلاقها.']::text[],'jobs@alofok.example'),
(6,'محاسب تكاليف','مصنع الرواد للصناعات الغذائية','الدمام','محاسب','دوام كامل','4–6 سنوات',ARRAY['تحليل التكاليف','الجرد','Tally']::text[],'حساب تكاليف الإنتاج وتحليل الانحرافات ومراجعة الجرد الدوري ودعم قرارات التسعير.',ARRAY['محاسب تكاليف يعمل في مصنع متعدد خطوط الإنتاج، ويتولى قياس تكلفة الوحدة وتحليل انحرافات المواد والعمالة والتكلفة الصناعية.','يعمل المنصب بشكل يومي مع إدارة الإنتاج والمخازن، ما يتطلب فهمًا عمليًا لدورة التصنيع والجرد ومراجعة أوامر الإنتاج.']::text[],ARRAY['حساب تكلفة الإنتاج لكل خط ومقارنتها بالتكلفة المعيارية.','تحليل انحرافات المواد والعمالة والتكلفة الصناعية ورفعها للإدارة.','مراجعة الجرد الدوري والنهائي وتوثيق الفروقات ومعالجتها.','دعم قرارات التسعير بتحليل الربحية لكل منتج.']::text[],ARRAY['بكالوريوس محاسبة، ويفضل خبرة في القطاع الصناعي أو الغذائي.','خبرة 4 إلى 6 سنوات في محاسبة التكاليف.','إتقان نظام Tally أو ما يعادله، مع تمكين في Excel.','القدرة على العمل مع فرق الإنتاج والمخازن ومراجعة المستندات.']::text[],ARRAY['سيرة ذاتية محدّثة.','نسخة من المؤهل العلمي.','نبذة عن نظام تكاليف عملتم عليه.']::text[],'careers@rowad-foods.example'),
(7,'أخصائي تسويات بنكية','شركة نماء المالية','جدة','أخصائي مالي','دوام جزئي','1–3 سنوات',ARRAY['التسويات البنكية','Excel','التحصيل']::text[],'مطابقة الحسابات البنكية يوميًا ومتابعة التحصيل وإعداد كشف التسويات الشهرية.',ARRAY['أخصائي تسويات بنكية يومية بين كشف الحساب البنكي وسجلات التحصيل، مع متابعة المبالغ المعلقة ومعالجتها قبل نهاية الشهر.','العمل دوام جزئي (أربع ساعات يوميًا) ويصلح لمن يبحث عن دور منتظم بدوام مرن، مع إمكانية التفرغ الكامل مستقبلًا.']::text[],ARRAY['مطابقة حركة الحسابات البنكية اليومية مع سجلات التحصيل في النظام.','متابعة المبالغ المعلقة والمرفوضة ومعالجة أسبابها مع البنك والعميل.','إعداد كشف التسويات الشهري للتحصيلات والعمولات البنكية.','أرشفة خطابات البنك والمستندات الداعمة بشكل قابل للمراجعة.']::text[],ARRAY['دبلوم أو بكالوريوس في المالية أو المحاسبة أو الإدارة.','خبرة سنة إلى 3 سنوات في التسويات البنكية أو التحصيل.','مهارات جيدة في Excel والانتباه للتفاصيل والأرقام.','الالتزام بمواعيد الإقفال اليومي والسرعة في المتابعة.']::text[],ARRAY['سيرة ذاتية محدّثة.','نسخة من المؤهل العلمي.','بيان بتوفر الدوام المطلوب.']::text[],'hiring@nama-finance.example'),
(8,'محلل مالي أول','منصة نُمو الرقمية','الرياض','محلل مالي','عن بُعد','4–6 سنوات',ARRAY['النمذجة المالية','Power BI','التخطيط']::text[],'بناء النماذج المالية وتحليل النتائج وإعداد تقارير الأداء لمجلس الإدارة، مع عمل مرن عن بُعد.',ARRAY['محلل مالي أول يبني نموذج التشغيل المالي للمنصة ويحدّثه شهريًا، ويربط مؤشرات التشغيل بالنتائج المالية لتوضيح مسار الإيرادات والتكاليف.','الفريق يعمل عن بُعد بترتيب واضح: اجتماع أسبوعي واحد، وتسليمات موثقة في نهاية كل شهر.']::text[],ARRAY['بناء نموذج مالي شهري وتحديث الفرضيات مع تغير الأداء الفعلي.','إعداد تقارير الأداء للشركاء ومجلس الإدارة بلغة واضحة.','تحليل تكلفة اكتساب العميل ومعدل الاحتفاظ وأثرهما على الربحية.','دعم دورة التخطيط والموازنة بمقارنات سيناريوهات مختلفة.']::text[],ARRAY['بكالوريوس مالية أو اقتصاد أو محاسبة، ويفضل شهادة مهنية أو CFA.','خبرة 4 إلى 6 سنوات في التحليل المالي أو التخطيط في الشركات الرقمية.','تمكين في النمذجة المالية وPower BI أو أداة عرض مماثلة.','انضباط في العمل عن بُعد وكتابة مهنية مختصرة وواضحة.']::text[],ARRAY['سيرة ذاتية محدّثة.','نسخة من المؤهل العلمي أو الشهادة المهنية.','نموذج مالي أو عرض أداء من إعدادك (بدون بيانات سرية).']::text[],'join@numo.example'),
(9,'متدرب محاسبة','مجموعة الحزم القابضة','جدة','متدرب','تدريب تعاوني','أقل من سنة',ARRAY['القيود اليومية','الأرشفة','Excel']::text[],'مساعدة فريق المحاسبة في تسجيل القيود وأرشفة المستندات ومطابقة الحسابات خلال فترة التدريب.',ARRAY['فرصة تدريب تعاوني لمدة ستة أشهر داخل فريق المحاسبة المالية، تشارك فيها في تسجيل القيود ومطابقة الحسابات وأرشفة المستندات بإشراف مباشر.','التدريب مدفوع الأجر ويمنح شهادة خبرة في نهاية الفترة، مع أولوية التوظيف لأفضل الأداء.']::text[],ARRAY['تسجيل القيود اليومية وإرفاق المستندات الداعمة بها.','أرشفة الفواتير والعقود في النظام بشكل قابل للمراجعة.','المشاركة في مطابقة الحسابات الجارية ومراجعة الأرصدة.','إعداد كشوف مساعدة بسيطة لأرشفة ومتابعة المذكرات.']::text[],ARRAY['طالب سنة أخيرة أو خريج حديث في المحاسبة أو المالية.','معرفة بمبادئ الدورة المحاسبية ومستوى جيد في Excel.','الالتزام بمواعيد التدريب وروح التعلم والمتابعة.','القدرة على العمل ضمن فريق والحفاظ على سرية المعلومات.']::text[],ARRAY['سيرة ذاتية محدّثة.','السجل الأكاديمي الأحدث.','بيان بمدة التدريب التعاوني المتاحة.']::text[],'internships@hazm.example');

SELECT setval('public.jobs_id_seq', (SELECT max(id) FROM public.jobs));