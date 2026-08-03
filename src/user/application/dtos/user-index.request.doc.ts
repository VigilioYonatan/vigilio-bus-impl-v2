import { createZodDto } from "nestjs-zod";
import { userIndexQueryDto } from "./user-index.request.dto";

export class UserIndexQueryDocDto extends createZodDto(userIndexQueryDto) {}
